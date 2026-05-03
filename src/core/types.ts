export type I18nextKitErrorCode =
  | "CONTRACTS_DIR_NOT_FOUND"
  | "EMPTY_CONTRACTS"
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
