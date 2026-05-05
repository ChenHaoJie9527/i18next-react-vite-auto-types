import type { ViteDevServer } from "vite";
import type { GenerateResult } from "../core/orchestrate";
import { resolveConfig } from "../core/resolve-config";
import type { I18nextKitConfig, ResolvedConfig } from "../core/types";
import {
  clearDevOverlay,
  logValidationReport,
  sendFatalOverlay,
  sendValidationOverlay,
  validationBuildError,
} from "./notify";

export type DevErrorFlag = { hadCatchError: boolean };

export function recoverResolvedCache(
  mergedConfig: I18nextKitConfig
): ResolvedConfig | undefined {
  try {
    return resolveConfig(mergedConfig);
  } catch {
    return;
  }
}

export function applyGenerateResult(
  result: GenerateResult,
  ctx: {
    command: "build" | "serve";
    devServer: ViteDevServer | undefined;
    devError: DevErrorFlag;
  }
): void {
  if (!result.validation.ok) {
    logValidationReport(result.validation);
    if (ctx.command === "build") {
      throw validationBuildError(result.validation);
    }
    sendValidationOverlay(ctx.devServer, result.validation);
    return;
  }
  if (ctx.command === "serve" && ctx.devServer) {
    clearDevOverlay(ctx.devServer);
    if (ctx.devError.hadCatchError) {
      ctx.devServer.config.logger.info(
        "[i18next-kit] 已从错误中恢复，生成成功",
        { timestamp: true }
      );
    }
  }
  ctx.devError.hadCatchError = false;
}

export function logFatalAndMaybeRethrow(
  error: unknown,
  ctx: {
    command: "build" | "serve";
    devServer: ViteDevServer | undefined;
    mergedConfig: I18nextKitConfig;
    setResolvedCache: (v: ResolvedConfig | undefined) => void;
  }
): void {
  const err = error instanceof Error ? error : new Error(String(error));
  if (ctx.devServer) {
    ctx.devServer.config.logger.error(err.message, { error: err });
  } else {
    console.error("[i18next-kit]", error);
  }
  ctx.setResolvedCache(recoverResolvedCache(ctx.mergedConfig));
  if (ctx.command === "build") {
    throw error instanceof Error ? error : new Error(String(error));
  }
  sendFatalOverlay(ctx.devServer, error);
}
