import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ResolvedConfig } from "../core/types";
import { watchI18nSources } from "../plugin/watch-i18n-sources";

type WatchHandler = (path: string) => void;

const mocks = vi.hoisted(() => {
  const close = vi.fn();
  const handlers = new Map<string, WatchHandler>();
  const watcher = {
    close,
    on: vi.fn((event: string, handler: WatchHandler) => {
      handlers.set(event, handler);
      return watcher;
    }),
  };
  const watch = vi.fn(() => watcher);

  return { close, handlers, watch, watcher };
});

vi.mock("chokidar", () => ({
  default: {
    watch: mocks.watch,
  },
}));

describe("watchI18nSources", () => {
  const config: ResolvedConfig = {
    root: "D:/project",
    framework: "vite",
    i18nDir: "D:/project/src/i18n",
    contractsDir: "D:/project/src/i18n/base",
    outDir: "D:/project/src/i18n",
    locales: ["en-US", "zh-CN"],
    mode: "folder",
  };

  beforeEach(() => {
    mocks.close.mockClear();
    mocks.watch.mockClear();
    mocks.watcher.on.mockClear();
    mocks.handlers.clear();
  });

  it("监听解析后的 i18n 目录，不触发初始事件", () => {
    watchI18nSources(config, vi.fn());

    expect(mocks.watch).toHaveBeenCalledWith(config.i18nDir, {
      ignoreInitial: true,
    });
  });

  it("注册 add, change, 和 unlink 处理器", () => {
    watchI18nSources(config, vi.fn());

    expect(mocks.handlers.has("add")).toBe(true);
    expect(mocks.handlers.has("change")).toBe(true);
    expect(mocks.handlers.has("unlink")).toBe(true);
  });

  it("传递相对于 i18n 目录的更改路径", () => {
    const onChange = vi.fn();
    watchI18nSources(config, onChange);

    mocks.handlers
      .get("change")
      ?.(join(config.i18nDir, "en-US", "common.ts"));

    expect(onChange).toHaveBeenCalledWith(join("en-US", "common.ts"));
  });

  it("关闭底层的 watcher", () => {
    const { stopWatch } = watchI18nSources(config, vi.fn());

    stopWatch();

    expect(mocks.close).toHaveBeenCalledTimes(1);
  });
});
