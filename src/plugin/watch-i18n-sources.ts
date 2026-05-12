import chokidar from "chokidar";
import { relative } from "node:path";
import type { ResolvedConfig } from "../core/types";

export type I18nSourceWatchChange = {
  type: "add" | "change" | "unlink";
  path: string;
};

/**
 * 监听 i18n 目录下的所有文件
 * @param config - 配置
 * @param onChange - 变化回调
 * @returns - 停止监听
 * @example
 * ```ts
 * watchI18nSources({
 *   i18nDir: "i18n",
 *   locales: ["en", "zh"],
 *   contractsDir: "contracts",
 *   baseDir: "base",
 * }, (path) => {
 *   console.log(path);
 * });
 * ```
 */
export function watchI18nSources(
  config: ResolvedConfig,
  onChange: (change: I18nSourceWatchChange) => void
) {
  // 监听 i18n 目录下的所有文件
  const watcher = chokidar.watch(config.i18nDir, {
    ignoreInitial: true,
  });

  watcher.on("add", (path) => {
    onChange({ type: "add", path: relative(config.i18nDir, path) });
  });
  watcher.on("change", (path) => {
    onChange({ type: "change", path: relative(config.i18nDir, path) });
  });
  watcher.on("unlink", (path) => {
    onChange({ type: "unlink", path: relative(config.i18nDir, path) });
  });

  const stopWatch = () => {
    watcher.close();
  };

  return {
    watcher,
    stopWatch,
  };
}
