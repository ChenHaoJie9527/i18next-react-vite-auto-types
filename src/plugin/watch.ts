import { isAbsolute, relative, resolve, sep } from "node:path";
import type { ViteDevServer } from "vite";
import { resolveConfig } from "../core/resolve-config";
import type { I18nextKitConfig, ResolvedConfig } from "../core/types";
import { isGeneratedFile } from "./paths";

function isSubPathOrEqual(parent: string, child: string): boolean {
  const rel = relative(resolve(parent), resolve(child));
  return rel === "" || !(rel.startsWith("..") || isAbsolute(rel));
}

function isAncestorDir(ancestor: string, descendant: string): boolean {
  const a = resolve(ancestor) + sep;
  const d = resolve(descendant);
  return d.startsWith(a);
}

/**
 * 是否与 i18n 契约/locale/产物目录相关（含「正在创建中的」父级路径，例如先建 src 再建 i18n）。
 */
export function isKitWatchPath(
  fsPath: string,
  resolved: ResolvedConfig
): boolean {
  const pathAbs = resolve(fsPath);
  const i18n = resolve(resolved.i18nDir);
  const contracts = resolve(resolved.contractsDir);
  const out = resolve(resolved.outDir);

  if (isSubPathOrEqual(i18n, pathAbs) || isAncestorDir(pathAbs, i18n)) {
    return true;
  }
  if (
    isSubPathOrEqual(contracts, pathAbs) ||
    isAncestorDir(pathAbs, contracts)
  ) {
    return true;
  }
  if (isSubPathOrEqual(out, pathAbs) || isAncestorDir(pathAbs, out)) {
    return true;
  }
  return false;
}

/**
 * 监听与 i18n-kit 相关的目录与文件变化（含仅创建目录、尚未触发 HMR 的情况），防抖后的重新生成由调用方提供。
 */
export function attachKitFsWatcher(
  server: ViteDevServer,
  getMergedConfig: () => I18nextKitConfig,
  scheduleRegenerate: () => void
): () => void {
  const handler = (event: string, rawPath: string) => {
    if (
      event !== "add" &&
      event !== "addDir" &&
      event !== "unlink" &&
      event !== "unlinkDir" &&
      event !== "change"
    ) {
      return;
    }

    let resolved: ResolvedConfig;
    try {
      resolved = resolveConfig(getMergedConfig());
    } catch {
      return;
    }

    const abs = resolve(rawPath);
    if (isGeneratedFile(abs, resolved)) {
      return;
    }
    if (!isKitWatchPath(rawPath, resolved)) {
      return;
    }
    scheduleRegenerate();
  };

  server.watcher.on("all", handler);
  return () => {
    server.watcher.off("all", handler);
  };
}
