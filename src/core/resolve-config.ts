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
}
