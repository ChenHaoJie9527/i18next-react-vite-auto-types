import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { writeIfChanged } from "@/core";
import type { ResolvedConfig } from "@/core/types";
import { createLocaleSource } from "./create-locale-source";
import { getBaseFileMetadata } from "./get-base-file-metadata";
import { inferLocaleDefaultValue } from "./infer-locale-default";

/**
 * 在新增或者修改时 同步对应的 locale 文件
 * @param config - 配置
 * @param baseFile - base 文件路径
 * @returns 同步的文件路径
 * @example
 * ```ts
 * syncOneBaseFile({
 *   locales: ["en", "zh"],
 *   i18nDir: "i18n",
 *   contractsDir: "contracts",
 *   baseDir: "base",
 * }, "user-management.ts");
 * // ["i18n/en/user-management.ts", "i18n/zh/user-management.ts"]
 * ```
 */
export function syncOneBaseFile(
  config: ResolvedConfig,
  baseFile: string
): string[] | undefined {
  const metadata = getBaseFileMetadata(baseFile);
  if (!metadata) {
    return;
  }

  const source = existsSync(baseFile) ? readFileSync(baseFile, "utf-8") : "";
  const defaultValue = inferLocaleDefaultValue(source, metadata.typeName);
  const content = createLocaleSource(
    metadata.namespace,
    metadata.typeName,
    defaultValue
  );
  const writtenFiles: string[] = [];

  for (const locale of config.locales) {
    const target = join(config.i18nDir, locale, `${metadata.namespace}.ts`);
    // 创建目录
    mkdirSync(dirname(target), {
      recursive: true,
    });

    // 判断 是否需要写入，只有内容发生变化时才写入
    if (writeIfChanged(target, content)) {
      writtenFiles.push(target);
    }
  }

  return writtenFiles;
}
