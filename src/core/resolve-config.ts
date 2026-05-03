import { isAbsolute, resolve } from "node:path";
import { type I18nextKitConfig, I18nextKitError } from "./types";

export function resolveConfig(config: I18nextKitConfig) {
  if (!Array.isArray(config.locales) || config.locales.length === 0) {
    throw new I18nextKitError("INVALID_CONFIG", "locales 不能为空数组");
  }

  if (config.mode !== "folder" && config.mode !== "file") {
    throw new I18nextKitError("INVALID_CONFIG", `未知 mode: ${config.mode}`);
  }

  if (config.mode === "file") {
    throw new I18nextKitError(
      "INVALID_CONFIG",
      "mode: 'file' 暂未实现，请使用 'folder' 模式"
    );
  }

  const root = resolveRoot(config.root);
  const i18nDir = resolveI18nDir(root, config.i18nDir);
  const contractsDir = resolveContractsDir(i18nDir, config.contractsDir);
  return { root, i18nDir, contractsDir };
}

/**
 * 如果 root 为空，则使用当前工作目录，否则使用传入的 root
 * resolve 函数会自动将相对路径转换为绝对路径
 * @param root - 项目根目录
 * @returns 项目根目录的绝对路径
 */
function resolveRoot(root: string | undefined) {
  return root ? resolve(root) : process.cwd();
}

/**
 * 如果 i18nDir 为空，则使用 "src/i18n"，否则使用传入的 i18nDir
 * resolve 函数会自动将相对路径转换为绝对路径
 * @param root - 项目根目录
 * @param i18nDir - i18n 目录
 * @returns i18n 目录的绝对路径
 */
function resolveI18nDir(root: string, i18nDir: string | undefined) {
  return resolve(root, i18nDir ?? "src/i18n");
}

/**
 * 如果 contractsDir 为空，则使用 "base"，否则使用传入的 contractsDir
 * resolve 函数会自动将相对路径转换为绝对路径
 * @param i18nDir - i18n 目录
 * @param contractsDir - contractsDir
 * @returns contractsDir 的绝对路径
 */
function resolveContractsDir(
  i18nDir: string,
  contractsDir: string | undefined
) {
  if (!contractsDir) {
    return resolve(i18nDir, "base");
  }

  return isAbsolute(contractsDir)
    ? contractsDir
    : resolve(i18nDir, contractsDir);
}
