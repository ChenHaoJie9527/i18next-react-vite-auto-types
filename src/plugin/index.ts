import type { Plugin } from "vite";
import type { I18nextKitConfig } from "../core/types";

export type I18nextKitPluginOptions = I18nextKitConfig;

/**
 * Vite 插件入口（重构中：当前为空壳，后续在此接入生成与监听逻辑）。
 */
export function i18nextKit(_options: I18nextKitPluginOptions): Plugin {
  return {
    name: "i18next-kit",
  };
}
