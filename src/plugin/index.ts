import type { Plugin } from "vite";
import type { I18nextKitConfig } from "../core/types";
import { watchI18nSources } from "./watch-i18n-sources";
import { resolveConfig } from "@/core/resolve-config";
import { generateAll } from "@/core/orchestrate";

export type I18nextKitPluginOptions = I18nextKitConfig;

export function i18nextKit(options: I18nextKitPluginOptions): Plugin {
  return {
    name: "i18next-kit",
    configureServer() {
      const config = resolveConfig(options);

      const scheduleGenerate = debounce(() => {
        generateAll(options);
      }, 100);

      const { watcher, stopWatch } = watchI18nSources(config, (_path) => {
        scheduleGenerate();
      });

      watcher.on("ready", () => {
        scheduleGenerate();
      });

      return () => {
        stopWatch();
      };
    },
  };
}

function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
) {
  let timer: NodeJS.Timeout | undefined;

  return (...args: Parameters<T>) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = undefined;
      func(...args);
    }, delay);
  };
}
