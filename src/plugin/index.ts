import type { Plugin, ViteDevServer } from "vite";
import { generateAll, prepareI18nScaffold } from "../core";
import { resolveConfig } from "../core/resolve-config";
import type { I18nextKitConfig, ResolvedConfig } from "../core/types";
import { debounce } from "./hmr";
import {
  I18nSourcesWatcher,
  i18nWatchPathsExistenceSignature,
} from "./i18n-sources-watcher";
import { logGenerateResult } from "./notify";
import { isGeneratedFile, isSourceFile, normalizePath } from "./paths";
import {
  applyGenerateResult,
  type DevErrorFlag,
  logFatalAndMaybeRethrow,
} from "./run-generate";
import { registerKitWatchTargets } from "./watch";

export type { I18nSourcesWatcherOptions } from "./i18n-sources-watcher";
export {
  I18nSourcesWatcher,
  i18nWatchPathsExistenceSignature,
} from "./i18n-sources-watcher";

export type I18nextKitPluginOptions = I18nextKitConfig;

const HMR_DEBOUNCE_MS = 100;

export function i18nextKit(options: I18nextKitPluginOptions): Plugin {
  let mergedConfig: I18nextKitConfig;
  let command: "build" | "serve";
  let devServer: ViteDevServer | undefined;
  let resolvedCache: ResolvedConfig | undefined;
  const devError: DevErrorFlag = { hadCatchError: false };
  let i18nSourcesWatcher: I18nSourcesWatcher | undefined;
  let lastI18nWatchPathsSig = "";

  const syncI18nWatcherAfterGenerate = () => {
    if (command !== "serve" || !i18nSourcesWatcher || !devServer) {
      return;
    }
    let resolved: ResolvedConfig;
    try {
      resolved = resolveConfig(mergedConfig);
    } catch {
      return;
    }
    const sig = i18nWatchPathsExistenceSignature(resolved);
    if (sig === lastI18nWatchPathsSig) {
      return;
    }
    i18nSourcesWatcher.start().then(
      () => {
        try {
          lastI18nWatchPathsSig = i18nWatchPathsExistenceSignature(
            resolveConfig(mergedConfig)
          );
        } catch {
          lastI18nWatchPathsSig = sig;
        }
      },
      (err: unknown) => {
        devServer?.config.logger.warn(
          `[i18next-kit] 重同步 i18n chokidar 失败: ${String(err)}`
        );
      }
    );
  };

  const runGenerate = () => {
    if (command === "serve" && devServer) {
      registerKitWatchTargets(devServer, () => mergedConfig);
    }
    try {
      mergedConfig = prepareI18nScaffold(mergedConfig);
      const result = generateAll({ ...mergedConfig, scaffold: false });
      resolvedCache = resolveConfig(mergedConfig);
      logGenerateResult(result);
      applyGenerateResult(result, { command, devServer, devError });
    } catch (error) {
      devError.hadCatchError = true;
      logFatalAndMaybeRethrow(error, {
        command,
        devServer,
        mergedConfig,
        setResolvedCache: (v) => {
          resolvedCache = v;
        },
      });
    } finally {
      if (command === "serve") {
        syncI18nWatcherAfterGenerate();
      }
    }
  };

  const scheduleRegenerate = debounce(runGenerate, HMR_DEBOUNCE_MS);

  return {
    name: "i18next-kit",
    configResolved(config) {
      command = config.command;
      mergedConfig = {
        ...options,
        root: options.root ?? config.root,
      };
    },
    buildStart() {
      runGenerate();
    },
    configureServer(server) {
      devServer = server;
      registerKitWatchTargets(server, () => mergedConfig);
      queueMicrotask(() => {
        registerKitWatchTargets(server, () => mergedConfig);
      });

      i18nSourcesWatcher = new I18nSourcesWatcher({
        getResolvedConfig: () => resolveConfig(mergedConfig),
        onSourcesChange: () => scheduleRegenerate(),
      });

      (async () => {
        try {
          await i18nSourcesWatcher?.start();
          lastI18nWatchPathsSig = i18nWatchPathsExistenceSignature(
            resolveConfig(mergedConfig)
          );
        } catch (err) {
          server.config.logger.warn(
            `[i18next-kit] i18n chokidar 启动失败: ${String(err)}`
          );
        }
      })();

      return () => {
        i18nSourcesWatcher?.stop();
        i18nSourcesWatcher = undefined;
        lastI18nWatchPathsSig = "";
      };
    },
    handleHotUpdate(ctx) {
      if (command !== "serve" || !resolvedCache) {
        return;
      }
      const file = normalizePath(ctx.file);
      if (isGeneratedFile(file, resolvedCache)) {
        return [];
      }
      if (!isSourceFile(file, resolvedCache)) {
        return;
      }
      scheduleRegenerate();
      return;
    },
  };
}
