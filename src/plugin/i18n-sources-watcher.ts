import { once } from "node:events";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { type ChokidarOptions, type FSWatcher, watch } from "chokidar";
import type { ResolvedConfig } from "../core/types";
import { isGeneratedFile, isSourceFile, normalizePath } from "./paths";

const DEFAULT_CHOKIDAR: ChokidarOptions = {
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 80,
    pollInterval: 50,
  },
};

function collectWatchPaths(resolved: ResolvedConfig): string[] {
  const paths: string[] = [
    resolve(resolved.i18nDir),
    resolve(resolved.contractsDir),
  ];
  for (const loc of resolved.locales) {
    paths.push(resolve(resolved.i18nDir, loc));
  }
  return [...new Set(paths)];
}

/**
 * 用于判断是否需要重建 chokidar：路径集合不变但某路径从「不存在」变为「存在」时（例如新建 locale 目录）也应变化。
 */
export function i18nWatchPathsExistenceSignature(
  resolved: ResolvedConfig
): string {
  return collectWatchPaths(resolved)
    .map((p) => `${p}\t${existsSync(p) ? "1" : "0"}`)
    .join("\n");
}

function toAbsolutePath(rawPath: string): string {
  return resolve(normalizePath(rawPath));
}

/**
 * 目录级 add/unlink：契约根目录或某个已配置 locale 的根目录变化时也应触发（例如新建空目录后再加文件）。
 */
function isLocaleOrContractsRootDir(
  event: string,
  abs: string,
  resolved: ResolvedConfig
): boolean {
  if (event !== "addDir" && event !== "unlinkDir") {
    return false;
  }
  const dir = resolve(abs);
  if (dir === resolve(resolved.contractsDir)) {
    return true;
  }
  for (const loc of resolved.locales) {
    if (dir === resolve(resolved.i18nDir, loc)) {
      return true;
    }
  }
  return false;
}

function shouldNotify(
  event: string,
  rawPath: string,
  resolved: ResolvedConfig
): boolean {
  const abs = toAbsolutePath(rawPath);
  if (isGeneratedFile(abs, resolved)) {
    return false;
  }
  if (isSourceFile(abs, resolved)) {
    return true;
  }
  return isLocaleOrContractsRootDir(event, abs, resolved);
}

export type I18nSourcesWatcherOptions = {
  /** 每次事件时解析当前配置（路径、locales 可能已变）。 */
  getResolvedConfig: () => ResolvedConfig;
  /** 契约或 locale 源文件发生相关变化时调用；防抖由调用方负责。 */
  onSourcesChange: () => void;
  /** 合并进 chokidar 默认项；默认含 ignoreInitial 与 awaitWriteFinish。 */
  chokidarOptions?: ChokidarOptions;
};

/**
 * 使用 chokidar 专职监听 i18n 契约目录与各语言目录下的源文件变化，
 * 与 Vite HMR / server.watcher 解耦。
 */
export class I18nSourcesWatcher {
  private watcher: FSWatcher | undefined;
  private readonly options: I18nSourcesWatcherOptions;

  constructor(options: I18nSourcesWatcherOptions) {
    this.options = options;
  }

  /**
   * 按当前 `getResolvedConfig()` 的路径启动监听；若已在运行则先关闭再启动。
   * 在 chokidar 发出 `ready` 之后 resolve，避免调用方在 watcher 就绪前写入文件而丢失事件。
   */
  async start(): Promise<void> {
    this.stop();
    let resolved: ResolvedConfig;
    try {
      resolved = this.options.getResolvedConfig();
    } catch {
      return;
    }

    const paths = collectWatchPaths(resolved).filter((p) => existsSync(p));
    if (paths.length === 0) {
      return;
    }

    const opts: ChokidarOptions = {
      ...DEFAULT_CHOKIDAR,
      ...this.options.chokidarOptions,
    };

    this.watcher = watch(paths, opts);
    this.watcher.on("all", (event, rawPath) => {
      if (
        event !== "add" &&
        event !== "addDir" &&
        event !== "change" &&
        event !== "unlink" &&
        event !== "unlinkDir"
      ) {
        return;
      }
      let current: ResolvedConfig;
      try {
        current = this.options.getResolvedConfig();
      } catch {
        return;
      }
      if (!shouldNotify(event, rawPath, current)) {
        return;
      }
      this.options.onSourcesChange();
    });

    try {
      await once(this.watcher, "ready");
    } catch {
      this.stop();
    }
  }

  /** 关闭 chokidar 实例；可重复调用。 */
  stop(): void {
    const w = this.watcher;
    this.watcher = undefined;
    if (w) {
      w.close().catch(() => {
        /* ignore close errors */
      });
    }
  }

  /** 是否已启动底层 watcher。 */
  get running(): boolean {
    return this.watcher !== undefined;
  }
}
