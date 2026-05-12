import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateAll } from "../core/orchestrate";
import type { I18nextKitConfig } from "../core/types";
import { i18nextKit } from "../plugin";
import { watchI18nSources } from "../plugin/watch-i18n-sources";

type WatchCallback = (path: string) => void;
type WatchHandler = (...args: unknown[]) => void;

const watcherHandlers = new Map<string, WatchHandler>();
const stopWatch = vi.fn();
let watchedChange: WatchCallback | undefined;

vi.mock("../plugin/watch-i18n-sources", () => ({
  watchI18nSources: vi.fn((_config, onChange: WatchCallback) => {
    watchedChange = onChange;
    return {
      watcher: {
        on: vi.fn((event: string, handler: WatchHandler) => {
          watcherHandlers.set(event, handler);
        }),
      },
      stopWatch,
    };
  }),
}));

vi.mock("../core/orchestrate", () => ({
  generateAll: vi.fn(),
}));

describe("i18nextKit plugin", () => {
  const options: I18nextKitConfig = {
    root: "D:/project",
    i18nDir: "src/i18n",
    locales: ["en-US", "zh-CN"],
    mode: "folder",
    scaffold: false,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    watcherHandlers.clear();
    stopWatch.mockClear();
    watchedChange = undefined;
    vi.mocked(generateAll).mockClear();
    vi.mocked(watchI18nSources).mockClear();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  function configurePlugin() {
    const plugin = i18nextKit(options);
    const configureServer = plugin.configureServer;
    if (typeof configureServer !== "function") {
      throw new Error("configureServer is not registered");
    }
    return configureServer({} as never) as (() => void) | undefined;
  }

  it("在 Vite 服务器配置过程中注册 i18n 监听器", () => {
    configurePlugin();

    expect(watchI18nSources).toHaveBeenCalledTimes(1);
    expect(watchI18nSources).toHaveBeenCalledWith(
      expect.objectContaining({
        i18nDir: "D:\\project\\src\\i18n",
        locales: options.locales,
      }),
      expect.any(Function)
    );
    expect(watcherHandlers.has("ready")).toBe(true);
  });

  it("在 watcher 准备好后执行生成", () => {
    configurePlugin();

    watcherHandlers.get("ready")?.();

    expect(generateAll).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(generateAll).toHaveBeenCalledTimes(1);
    expect(generateAll).toHaveBeenCalledWith(options);
  });

  it("在 watched 源发生变化后执行生成", () => {
    configurePlugin();

    watchedChange?.("en-US/common.ts");

    vi.advanceTimersByTime(100);
    expect(generateAll).toHaveBeenCalledTimes(1);
    expect(generateAll).toHaveBeenCalledWith(options);
  });

  it("将多个 watcher 通知合并为一个生成", () => {
    configurePlugin();

    watchedChange?.("en-US/common.ts");
    vi.advanceTimersByTime(50);
    watchedChange?.("zh-CN/common.ts");
    vi.advanceTimersByTime(99);

    expect(generateAll).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(generateAll).toHaveBeenCalledTimes(1);
  });

  it("在 Vite 释放插件钩子时停止 watcher", () => {
    const cleanup = configurePlugin();

    cleanup?.();

    expect(stopWatch).toHaveBeenCalledTimes(1);
  });
});
