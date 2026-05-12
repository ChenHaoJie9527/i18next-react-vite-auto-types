import { isAbsolute, join, relative } from "node:path";
import type { Plugin, ViteDevServer } from "vite";
import type { I18nextKitConfig } from "../core/types";
import {
  type I18nSourceWatchChange,
  watchI18nSources,
} from "./watch-i18n-sources";
import { createI18nWatchSignature } from "./watch-signature";
import { syncLocales } from "@/core/sync-locales";
import { resolveConfig } from "@/core/resolve-config";
import { generateAll } from "@/core/orchestrate";

export type I18nextKitPluginOptions = I18nextKitConfig;

export function i18nextKit(options: I18nextKitPluginOptions): Plugin {
  return {
    name: "i18next-kit",
    configureServer(server) {
      const config = resolveConfig(options);
      let activeSignature = createI18nWatchSignature(config);

      const scheduleGenerate = debounce(() => {
        runGenerate(options);
      }, 100);
      let baseChangeHandler = createBaseChangeHandler(config);
      /**
       * 如果签名发生变化，则重新同步
       * @returns - 是否重新同步
       * @example
       * ```ts
       * const nextConfig = resolveConfig(options);
       * const nextSignature = createI18nWatchSignature(nextConfig);
       * if (nextSignature === activeSignature) {
       *   return false;
       * }
       *
       * baseChangeHandler.close();
       * activeSignature = nextSignature;
       * baseChangeHandler = createBaseChangeHandler(nextConfig);
       * return true;
       * ```
       */
      const resyncIfSignatureChanged = () => {
        const nextConfig = resolveConfig(options);
        const nextSignature = createI18nWatchSignature(nextConfig);
        if (nextSignature === activeSignature) {
          return false;
        }

        baseChangeHandler.close();
        activeSignature = nextSignature;
        baseChangeHandler = createBaseChangeHandler(nextConfig);
        return true;
      };

      const { watcher, stopWatch } = watchI18nSources(config, (change) => {
        resyncIfSignatureChanged();
        baseChangeHandler.handle(change);
        scheduleGenerate();
      });

      watcher.on("ready", () => {
        resyncIfSignatureChanged();
        scheduleGenerate();
      });

      const cleanup = () => {
        baseChangeHandler.close();
        stopWatch();
      };

      registerServerCleanup(server, cleanup);
    },
  };
}

function registerServerCleanup(server: ViteDevServer, cleanup: () => void) {
  server.httpServer?.once("close", cleanup);
}

/**
 * 创建基础文件更改处理器
 * @param config
 * @returns - 基础文件更改处理器
 * @example
 * ```ts
 * createBaseChangeHandler({
 *   i18nDir: "i18n",
 *   contractsDir: "contracts",
 * });
 * ```
 */
function createBaseChangeHandler(config: ReturnType<typeof resolveConfig>) {
  let pendingUnlink:
    | {
        file: string;
        timer: NodeJS.Timeout;
      }
    | undefined;

  /**
   * 刷新 pending 的 unlink 操作
   */
  const flushPendingUnlink = () => {
    if (!pendingUnlink) {
      return;
    }

    const { file, timer } = pendingUnlink;
    clearTimeout(timer);
    pendingUnlink = undefined;
    syncLocales(config, { type: "unlink", file });
  };

  return {
    close() {
      if (pendingUnlink) {
        clearTimeout(pendingUnlink.timer);
        pendingUnlink = undefined;
      }
    },
    handle(change: I18nSourceWatchChange) {
      const baseFile = resolveBaseChangeFile(config, change.path);
      if (!baseFile) {
        return;
      }

      if (change.type === "unlink") {
        flushPendingUnlink();
        pendingUnlink = {
          file: baseFile,
          timer: setTimeout(() => {
            pendingUnlink = undefined;
            syncLocales(config, { type: "unlink", file: baseFile });
          }, 100),
        };
        return;
      }

      if (change.type === "add" && pendingUnlink) {
        const { file: oldFile, timer } = pendingUnlink;
        clearTimeout(timer);
        pendingUnlink = undefined;
        syncLocales(config, { type: "rename", oldFile, newFile: baseFile });
        return;
      }

      flushPendingUnlink();
      syncLocales(config, { type: change.type, file: baseFile });
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
