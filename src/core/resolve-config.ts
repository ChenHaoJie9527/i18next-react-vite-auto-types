import { type I18nextKitConfig, I18nextKitError } from "./types";

export function resolveConfig(config: I18nextKitConfig) {
  if (!Array.isArray(config.locales) || config.locales.length === 0) {
    throw new I18nextKitError("INVALID_CONFIG", "locales 不能为空数组");
  }
}
