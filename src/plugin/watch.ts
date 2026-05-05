import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import type { ViteDevServer } from "vite";
import { resolveConfig } from "../core/resolve-config";
import type { I18nextKitConfig, ResolvedConfig } from "../core/types";
import { isGeneratedFile, normalizePath } from "./paths";

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
 * chokidar 在部分环境下给出相对路径（相对 config.root），与 resolveConfig 得到的绝对路径比对会漏判。
 */
export function toWatchAbsolutePath(
  server: ViteDevServer,
  rawPath: string
): string {
  const normalized = normalizePath(rawPath);
  if (isAbsolute(normalized)) {
    return resolve(normalized);
  }
  return resolve(server.config.root, normalized);
}

function collectAncestorsToRoot(leaf: string, root: string): string[] {
  const rootAbs = resolve(root);
  const out: string[] = [];
  let dir = resolve(leaf);
  for (let i = 0; i < 64; i++) {
    out.push(dir);
    if (dir === rootAbs) {
      break;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return out;
}

/**
 * 显式把 i18n / 契约 / 产物路径及其祖先加入 chokidar，避免「目录尚不存在」时从未进入监视树、后续 mkdir 无事件的问题。
 */
export function registerKitWatchTargets(
  server: ViteDevServer,
  getMergedConfig: () => I18nextKitConfig
): void {
  let resolved: ResolvedConfig;
  try {
    resolved = resolveConfig(getMergedConfig());
  } catch {
    return;
  }

  const toAdd = new Set<string>();
  for (const leaf of [
    resolved.i18nDir,
    resolved.contractsDir,
    resolved.outDir,
  ]) {
    for (const p of collectAncestorsToRoot(leaf, resolved.root)) {
      toAdd.add(p);
    }
  }

  for (const p of toAdd) {
    try {
      server.watcher.add(p);
    } catch {
      /* 个别环境下对尚不存在的 leaf add 可能失败，祖先路径仍可能已生效 */
    }
  }
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

    const abs = toWatchAbsolutePath(server, rawPath);
    if (isGeneratedFile(abs, resolved)) {
      return;
    }
    if (!isKitWatchPath(abs, resolved)) {
      return;
    }
    scheduleRegenerate();
  };

  server.watcher.on("all", handler);
  return () => {
    server.watcher.off("all", handler);
  };
}
