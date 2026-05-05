import type { Plugin, ViteDevServer } from "vite";
import { generateAll } from "../core";
import { resolveConfig } from "../core/resolve-config";
import type { I18nextKitConfig, ResolvedConfig } from "../core/types";
import { debounce } from "./hmr";
import { logGenerateResult } from "./notify";
import { isGeneratedFile, isSourceFile, normalizePath } from "./paths";
import {
  applyGenerateResult,
  type DevErrorFlag,
  logFatalAndMaybeRethrow,
} from "./run-generate";
import { attachKitFsWatcher } from "./watch";

export type I18nextKitPluginOptions = I18nextKitConfig;

const HMR_DEBOUNCE_MS = 100;

export function i18nextKit(options: I18nextKitPluginOptions): Plugin {
  let mergedConfig: I18nextKitConfig;
  let command: "build" | "serve";
  let devServer: ViteDevServer | undefined;
  let resolvedCache: ResolvedConfig | undefined;
  const devError: DevErrorFlag = { hadCatchError: false };

  const runGenerate = () => {
    try {
      const result = generateAll(mergedConfig);
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
      const stopWatch = attachKitFsWatcher(
        server,
        () => mergedConfig,
        scheduleRegenerate
      );
      return () => {
        stopWatch();
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
