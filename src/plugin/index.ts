import type { Plugin, ViteDevServer } from "vite";
import { generateAll } from "../core";
import { resolveConfig } from "../core/resolve-config";
import type { I18nextKitConfig, ResolvedConfig } from "../core/types";
import { debounce } from "./hmr";
import {
  logGenerateResult,
  logValidationReport,
  sendFatalOverlay,
  sendValidationOverlay,
  validationBuildError,
} from "./notify";
import { isGeneratedFile, isSourceFile, normalizePath } from "./paths";

export type I18nextKitPluginOptions = I18nextKitConfig;

const HMR_DEBOUNCE_MS = 100;

export function i18nextKit(options: I18nextKitPluginOptions): Plugin {
  let mergedConfig: I18nextKitConfig;
  let command: "build" | "serve";
  let devServer: ViteDevServer | undefined;
  let resolvedCache: ResolvedConfig | undefined;

  const runGenerate = () => {
    try {
      const result = generateAll(mergedConfig);
      resolvedCache = resolveConfig(mergedConfig);
      logGenerateResult(result);

      if (!result.validation.ok) {
        logValidationReport(result.validation);
        if (command === "build") {
          throw validationBuildError(result.validation);
        }
        sendValidationOverlay(devServer, result.validation);
      }
    } catch (error) {
      console.error("[i18next-kit]", error);
      try {
        resolvedCache = resolveConfig(mergedConfig);
      } catch {
        resolvedCache = undefined;
      }
      if (command === "build") {
        throw error instanceof Error ? error : new Error(String(error));
      }
      sendFatalOverlay(devServer, error);
    }
  };

  const scheduleRegenerate = debounce(runGenerate, HMR_DEBOUNCE_MS);

  return {
    name: "i18next-kit",
    // 合并 options 与 config,root，如果用户没有传 root，则使用 config.root
    configResolved(config) {
      command = config.command;
      mergedConfig = {
        ...options,
        root: options.root ?? config.root,
      };
    },
    // 构建开始时，调用 generateAll；成功则缓存 resolveConfig 结果提供 HMR 根目录
    buildStart() {
      runGenerate();
    },
    // 配置 server，用于 ws overlay / 终端提示
    configureServer(server) {
      devServer = server;
    },
    // 处理热更新，仅源文件命中时 debounce 后再 generateAll
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
