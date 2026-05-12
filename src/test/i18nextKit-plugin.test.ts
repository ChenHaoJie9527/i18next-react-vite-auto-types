import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateAll } from "../core/orchestrate";
import { syncLocales } from "../core/sync-locales";
import type { I18nextKitConfig } from "../core/types";
import { i18nextKit } from "../plugin";
import { watchI18nSources } from "../plugin/watch-i18n-sources";
import type { I18nSourceWatchChange } from "../plugin/watch-i18n-sources";

type WatchCallback = (change: I18nSourceWatchChange) => void;
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

vi.mock("@/core/orchestrate", () => ({
  generateAll: vi.fn(),
}));

vi.mock("@/core/sync-locales", () => ({
  syncLocales: vi.fn(),
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
    vi.mocked(syncLocales).mockClear();
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

  it("registers the i18n watcher during Vite server setup", () => {
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

  it("runs generation after watcher ready is debounced", () => {
    configurePlugin();

    watcherHandlers.get("ready")?.();

    expect(generateAll).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(generateAll).toHaveBeenCalledTimes(1);
    expect(generateAll).toHaveBeenCalledWith(options);
  });

  it("syncs added base files before debounced generation", () => {
    configurePlugin();

    watchedChange?.({ type: "add", path: "base/common.ts" });

    expect(syncLocales).toHaveBeenCalledTimes(1);
    expect(syncLocales).toHaveBeenCalledWith(
      expect.objectContaining({
        contractsDir: "D:\\project\\src\\i18n\\base",
      }),
      {
        type: "add",
        file: "D:\\project\\src\\i18n\\base\\common.ts",
      }
    );
    expect(generateAll).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(generateAll).toHaveBeenCalledTimes(1);
  });

  it("syncs changed and unlinked base files with matching event types", () => {
    configurePlugin();

    watchedChange?.({ type: "change", path: "base/common.ts" });
    watchedChange?.({ type: "unlink", path: "base/user-management.ts" });

    expect(syncLocales).toHaveBeenNthCalledWith(
      1,
      expect.any(Object),
      {
        type: "change",
        file: "D:\\project\\src\\i18n\\base\\common.ts",
      }
    );
    expect(syncLocales).toHaveBeenNthCalledWith(
      2,
      expect.any(Object),
      {
        type: "unlink",
        file: "D:\\project\\src\\i18n\\base\\user-management.ts",
      }
    );
  });

  it("does not sync locale file changes back to base", () => {
    configurePlugin();

    watchedChange?.({ type: "add", path: "en-US/new-page.ts" });
    watchedChange?.({ type: "change", path: "en-US/common.ts" });
    watchedChange?.({ type: "unlink", path: "zh-CN/old-page.ts" });

    expect(syncLocales).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(generateAll).toHaveBeenCalledTimes(1);
    expect(generateAll).toHaveBeenCalledWith(options);
  });

  it("debounces multiple watcher notifications into one generation", () => {
    configurePlugin();

    watchedChange?.({ type: "change", path: "en-US/common.ts" });
    vi.advanceTimersByTime(50);
    watchedChange?.({ type: "change", path: "zh-CN/common.ts" });
    vi.advanceTimersByTime(99);

    expect(generateAll).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(generateAll).toHaveBeenCalledTimes(1);
  });

  it("stops the watcher when Vite disposes the plugin hook", () => {
    const cleanup = configurePlugin();

    cleanup?.();

    expect(stopWatch).toHaveBeenCalledTimes(1);
  });
});
