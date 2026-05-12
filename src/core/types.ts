export type I18nextKitErrorCode =
  | "CONTRACTS_DIR_NOT_FOUND"
  | "EMPTY_CONTRACTS"
  | "I18N_DIR_NOT_FOUND"
  | "LOCALE_DIR_NOT_FOUND"
  | "INVALID_CONFIG";

/**
 * The error class for i18next-kit.
 * @param code - The error code.
 * @param message - The error message.
 * @param detail - The error detail.
 * @example
 * ```ts
 * throw new I18nextKitError("CONTRACTS_DIR_NOT_FOUND", "The contracts directory does not exist");
 * ```
 */
export class I18nextKitError extends Error {
  readonly code: I18nextKitErrorCode;
  readonly detail?: Record<string, unknown>;

  constructor(
    code: I18nextKitErrorCode,
    message: string,
    detail?: Record<string, unknown>
  ) {
    super(`[${code}] ${message}`);
    this.name = "I18nextKitError";
    this.code = code;
    this.detail = detail ?? {};
  }
}

export type I18nextKitMode = "folder" | "file";
export type I18nextKitDiagnostics = "none" | "info";

type SharedConfig = {
  locales: readonly string[];
  mode: I18nextKitMode;
  /**
   * Vite 插件的开发时诊断功能。MVP 版本默认设置为“none”。
   */
  diagnostics?: I18nextKitDiagnostics;
  /**
   * 向后兼容的简写，用于禁用开发时诊断。
   */
  silent?: boolean;
  /**
   * 为 true（默认）时在生成前按需写入最小 i18n 模板；单测或显式校验宿主目录时可设为 false。
   */
  scaffold?: boolean;
};

export type I18nextKitFramework = "vite" | "next";

type ConfigPaths = {
  root: string;
  i18nDir: string;
  contractsDir: string;
  outDir: string;
  framework: I18nextKitFramework;
};

export type I18nextKitConfig = SharedConfig & Partial<ConfigPaths>;

export type ResolvedConfig = SharedConfig & ConfigPaths;
