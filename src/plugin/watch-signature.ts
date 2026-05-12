import type { ResolvedConfig } from "../core/types";

/**
 * 创建 i18n 监听签名
 * @param config - 配置
 * @returns - 签名
 * @example
 * ```ts
 * createI18nWatchSignature({
 *   i18nDir: "i18n",
 *   contractsDir: "contracts",
 *   locales: ["en", "zh"],
 * });
 * // "{"contractsDir":"contracts","i18nDir":"i18n","locales":["en","zh"]}"
 * @returns
 */
export function createI18nWatchSignature(config: ResolvedConfig) {
  return JSON.stringify({
    contractsDir: config.contractsDir,
    i18nDir: config.i18nDir,
    locales: [...config.locales].sort(),
  });
}
