import { basename, isAbsolute, relative, resolve } from "node:path";
import type { ResolvedConfig } from "../core/types";

const GENERATED_BASENAMES = new Set([
  "generated-resources.ts",
  "contracts.ts",
  "generated-runtime.ts",
  "i18next.d.ts",
]);

/**
 * 标准化路径
 * @param file - 文件路径
 * @returns - 标准化后的文件路径
 */
export function normalizePath(file: string): string {
  return file.replaceAll("\\", "/");
}

/**
 * 判断子路径是否在父路径的子路径中
 * @param parentAbs - 父路径
 * @param childAbs - 子路径
 * @returns - 是否在子路径中
 */
function isSubPath(parentAbs: string, childAbs: string) {
  const parent = resolve(parentAbs);
  const child = resolve(childAbs);
  const rel = relative(parent, child);
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

/**
 * 判断文件是否是生成文件
 * @param absoluteFile - 文件路径
 * @param config - 配置
 * @returns - 是否是生成文件
 */
export function isGeneratedFile(
  absoluteFile: string,
  config: ResolvedConfig
): boolean {
  const name = basename(absoluteFile);
  if (!GENERATED_BASENAMES.has(name)) {
    return false;
  }
  return isSubPath(config.outDir, absoluteFile);
}

/**
 * 判断文件是否是源文件
 * @param absoluteFile - 文件路径
 * @param config - 配置
 * @returns - 是否是源文件
 */
export function isSourceFile(
  absoluteFile: string,
  config: ResolvedConfig
): boolean {
  if (isGeneratedFile(absoluteFile, config)) {
    return false;
  }

  const file = absoluteFile;
  if (
    isSubPath(config.contractsDir, file) &&
    file.endsWith(".ts") &&
    !file.endsWith(".d.ts")
  ) {
    return true;
  }

  for (const locale of config.locales) {
    const localeRoot = resolve(config.i18nDir, locale);
    if (
      isSubPath(localeRoot, file) &&
      file.endsWith(".ts") &&
      !file.endsWith(".d.ts")
    ) {
      return true;
    }
  }

  return false;
}
