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
): BaseLocaleSyncResult {}
