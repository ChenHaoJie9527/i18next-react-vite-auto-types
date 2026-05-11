import chokidar from "chokidar";
import { relative } from "node:path";
import type { ResolvedConfig } from "../core/types";

export function watchI18nSources(
  config: ResolvedConfig,
  onChange: (path: string) => void
) {
  // 监听 i18n 目录下的所有文件
  const watcher = chokidar.watch(config.i18nDir, {
    ignoreInitial: true,
  });

  watcher.on("add", (path) => {
    onChange(relative(config.i18nDir, path));
  });
  watcher.on("change", (path) => {
    onChange(relative(config.i18nDir, path));
  });
  watcher.on("unlink", (path) => {
    onChange(relative(config.i18nDir, path));
  });

  const stopWatch = () => {
    watcher.close();
  };

  return {
    watcher,
    stopWatch,
  };
}
