import { join } from "node:path";
import { deleteOneBaseFileLocales } from "@/lib/delete-one-base-file-locales";
import { renameOneBaseFileLocales } from "@/lib/rename-one-base-file-locales";
import { syncOneBaseFile } from "@/lib/sync-one-base-file";
import { scanContracts } from "./scan-contracts";
import type { ResolvedConfig } from "./types";

export type BaseLocaleSyncChange =
  | { type: "add"; file: string }
  | { type: "change"; file: string }
  | { type: "unlink"; file: string }
  | { type: "rename"; oldFile: string; newFile: string };

export type BaseLocaleSyncResult = {
  writtenFiles: string[];
  deletedFiles: string[];
  renamedFiles: { from: string; to: string }[];
};

export type SyncAllBaseFilesResult = {
  writtenFiles: string[];
};

/**
 * 同步函数
 * 1. 根据 ResolvedConfig 找到 contractsDir、i18nDir、locales
 * 2. 根据 base 侧变更生成 / 覆盖 /删除 对应的 locale 文件
 * 3. 生成 locale 文件内容时统一使用
 *
 * @param config - 配置
 * @param change - 变更
 * @returns 同步结果
 *
 * @example
 * ```ts
 * import type { XxxMessage } from "../base/foo";
 *
 * export default {} satisfies XxxMessage;
 * ```
 */
export function syncLocales(
  config: ResolvedConfig,
  change: BaseLocaleSyncChange
): BaseLocaleSyncResult {
  const result: BaseLocaleSyncResult = {
    writtenFiles: [],
    deletedFiles: [],
    renamedFiles: [],
  };

  // 新增或变更
  if (change.type === "add" || change.type === "change") {
    const writtenFiles = syncOneBaseFile(config, change.file);
    if (writtenFiles) {
      result.writtenFiles.push(...writtenFiles);
    }
  }

  if (change.type === "unlink") {
    const deletedFiles = deleteOneBaseFileLocales(config, change.file);
    if (deletedFiles) {
      result.deletedFiles.push(...deletedFiles);
    }
  }

  if (change.type === "rename") {
    const renamedFiles = renameOneBaseFileLocales(
      config,
      change.oldFile,
      change.newFile
    );
    if (renamedFiles?.length) {
      result.renamedFiles.push(...renamedFiles);
    }
  }

  return result;
}

/**
 * 同步 base 目录下的所有文件到各 locale 目录。
 * 适用于启动时的全量对齐，比如 Cli 或者 Vite dev 时，因为这是首次执行，所以没有变更，直接全量同步
 *
 * @param config - 配置
 * @returns 全量同步结果
 */
export function syncAllBaseFiles(
  config: ResolvedConfig
): SyncAllBaseFilesResult {
  const writtenFiles: string[] = [];
  const namespaces = scanContracts(config.contractsDir);

  for (const { name } of namespaces) {
    const baseFile = join(config.contractsDir, `${name}.ts`);
    const result = syncOneBaseFile(config, baseFile);
    if (result?.length) {
      writtenFiles.push(...result);
    }
  }

  return { writtenFiles };
}
