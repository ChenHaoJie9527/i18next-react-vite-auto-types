import { isAbsolute, join, relative } from "node:path";
import type { Plugin } from "vite";
import type { I18nextKitConfig } from "../core/types";
import { watchI18nSources } from "./watch-i18n-sources";
import { syncLocales } from "@/core/sync-locales";
import { resolveConfig } from "@/core/resolve-config";
import { generateAll } from "@/core/orchestrate";

export type I18nextKitPluginOptions = I18nextKitConfig;

export function i18nextKit(options: I18nextKitPluginOptions): Plugin {
  return {
    name: "i18next-kit",
    configureServer() {
      const config = resolveConfig(options);

      const scheduleGenerate = debounce(() => {
        runGenerate(options);
      }, 100);

      const { watcher, stopWatch } = watchI18nSources(config, (change) => {
        const baseFile = resolveBaseChangeFile(config, change.path);
        if (baseFile) {
          syncLocales(config, { type: change.type, file: baseFile });
        }
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

function resolveDiagnostics(options: I18nextKitPluginOptions) {
  if (options.silent === true) {
    return "none";
  }

  return options.diagnostics ?? "none";
}

function runGenerate(options: I18nextKitPluginOptions) {
  const diagnostics = resolveDiagnostics(options);

  try {
    const result = generateAll(options);
    if (diagnostics === "info") {
      console.info(
        `[i18next-kit] generated ${result.writtenFiles.length} file(s) in ${Math.round(result.durationMs)}ms`
      );
    }
  } catch (error) {
    if (diagnostics === "info") {
      console.info("[i18next-kit] generation skipped", error);
    }
  }
}

/**
 * 解析基础文件路径
 * @param config - 配置
 * @param changedPath - 更改路径
 * @returns - 基础文件路径
 * @example
 * ```ts
 * resolveBaseChangeFile({
 *   i18nDir: "i18n",
 *   contractsDir: "contracts",
 * }, "user-management.ts");
 * // "i18n/en/user-management.ts"
 * // "i18n/zh/user-management.ts"
 * ```
 */
function resolveBaseChangeFile(
  config: ReturnType<typeof resolveConfig>,
  changedPath: string
) {
  const absolutePath = isAbsolute(changedPath)
    ? changedPath
    : join(config.i18nDir, changedPath);

  const relativeToContracts = relative(config.contractsDir, absolutePath);
  if (
    relativeToContracts === "" ||
    relativeToContracts.startsWith("..") ||
    isAbsolute(relativeToContracts)
  ) {
    return;
  }

  return absolutePath;
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
