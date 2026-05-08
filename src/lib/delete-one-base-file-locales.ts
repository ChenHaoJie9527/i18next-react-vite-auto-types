import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { ResolvedConfig } from "@/core/types";
import { getBaseFileMetadata } from "./get-base-file-metadata";

/**
 * 删除对应的 locale 文件
 * @param config - 配置
 * @param file - base 文件路径
 * @returns 删除的 locale 文件路径
 * @example
 * ```ts
 * deleteOneBaseFileLocales({
 *   locales: ["en-US", "zh-CN"],
 *   i18nDir: "i18n",
 *   contractsDir: "contracts",
 *   baseDir: "base",
 * }, "user-management.ts");
 * // ["i18n/en-US/user-management.ts", "i18n/zh-CN/user-management.ts"]
 * ```
 */
export function deleteOneBaseFileLocales(
  config: ResolvedConfig,
  file: string
): string[] | undefined {
  const metadata = getBaseFileMetadata(file);
  if (!metadata) {
    return;
  }

  const deletedFiles: string[] = [];

  for (const locale of config.locales) {
    const target = join(config.i18nDir, locale, `${metadata.namespace}.ts`);
    if (existsSync(target)) {
      // 删除文件, force: true 表示强制删除
      rmSync(target, { force: true });
      deletedFiles.push(target);
    }
  }

  return deletedFiles;
}
