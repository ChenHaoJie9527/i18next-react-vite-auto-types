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

  it("watches the resolved i18n directory without initial events", () => {
    watchI18nSources(config, vi.fn());

    expect(mocks.watch).toHaveBeenCalledWith(config.i18nDir, {
      ignoreInitial: true,
    });
  });

  it("registers add, change, and unlink handlers", () => {
    watchI18nSources(config, vi.fn());

    expect(mocks.handlers.has("add")).toBe(true);
    expect(mocks.handlers.has("change")).toBe(true);
    expect(mocks.handlers.has("unlink")).toBe(true);
  });

  it("passes changed paths relative to the i18n directory", () => {
    const onChange = vi.fn();
    watchI18nSources(config, onChange);

    mocks.handlers
      .get("change")
      ?.(join(config.i18nDir, "en-US", "common.ts"));

    expect(onChange).toHaveBeenCalledWith({
      type: "change",
      path: join("en-US", "common.ts"),
    });
  });

  it("passes add and unlink event types", () => {
    const onChange = vi.fn();
    watchI18nSources(config, onChange);

    mocks.handlers.get("add")?.(join(config.i18nDir, "base", "common.ts"));
    mocks.handlers
      .get("unlink")
      ?.(join(config.i18nDir, "base", "user-management.ts"));

    expect(onChange).toHaveBeenNthCalledWith(1, {
      type: "add",
      path: join("base", "common.ts"),
    });
    expect(onChange).toHaveBeenNthCalledWith(2, {
      type: "unlink",
      path: join("base", "user-management.ts"),
    });
  });

  it("closes the underlying watcher", () => {
    const { stopWatch } = watchI18nSources(config, vi.fn());

    stopWatch();

    expect(mocks.close).toHaveBeenCalledTimes(1);
  });
});
