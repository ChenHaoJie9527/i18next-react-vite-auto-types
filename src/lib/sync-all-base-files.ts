import type { ResolvedConfig } from "@/core/types";
import { scanContracts } from "../core/scan-contracts";
import { join } from "node:path";
import type { SyncAllBaseFilesResult } from "@/core/sync-locales";
import { syncOneBaseFile } from "./sync-one-base-file";

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
