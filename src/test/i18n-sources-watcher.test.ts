import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveConfig } from "../core/resolve-config";
import { I18nSourcesWatcher } from "../plugin/i18n-sources-watcher";

describe("I18nSourcesWatcher", () => {
  let root: string | undefined;

  afterEach(() => {
    if (root) {
      rmSync(root, { recursive: true, force: true });
      root = undefined;
    }
  });

  it("契约目录下新增 .ts 文件时触发 onSourcesChange", async () => {
    root = mkdtempSync(join(tmpdir(), "i18n-sources-watcher-"));
    const i18nDir = join(root, "src", "i18n");
    const baseDir = join(i18nDir, "base");
    const enDir = join(i18nDir, "en-US");
    mkdirSync(baseDir, { recursive: true });
    mkdirSync(enDir, { recursive: true });
    writeFileSync(
      join(baseDir, "common.ts"),
      "export type CommonMessage = {};\n"
    );
    writeFileSync(join(enDir, "common.ts"), "export default {};\n");

    const resolved = resolveConfig({
      root,
      i18nDir: "src/i18n",
      locales: ["en-US"],
      mode: "folder",
    });

    const onSourcesChange = vi.fn();
    const watcher = new I18nSourcesWatcher({
      getResolvedConfig: () => resolved,
      onSourcesChange,
      chokidarOptions: {
        awaitWriteFinish: false,
        usePolling: true,
        interval: 100,
      },
    });

    await watcher.start();
    expect(watcher.running).toBe(true);

    writeFileSync(join(baseDir, "user.ts"), "export type UserMessage = {};\n");

    await vi.waitFor(() => expect(onSourcesChange).toHaveBeenCalled(), {
      timeout: 15_000,
      interval: 50,
    });

    watcher.stop();
    expect(watcher.running).toBe(false);
  }, 20_000);

  it("stop 可重复调用", async () => {
    root = mkdtempSync(join(tmpdir(), "i18n-sources-watcher-stop-"));
    const i18nDir = join(root, "src", "i18n");
    mkdirSync(join(i18nDir, "base"), { recursive: true });
    mkdirSync(join(i18nDir, "en-US"), { recursive: true });
    writeFileSync(join(i18nDir, "base", "a.ts"), "export type A = {};\n");
    writeFileSync(join(i18nDir, "en-US", "a.ts"), "export default {};\n");

    const resolved = resolveConfig({
      root,
      locales: ["en-US"],
      mode: "folder",
    });

    const watcher = new I18nSourcesWatcher({
      getResolvedConfig: () => resolved,
      onSourcesChange: vi.fn(),
      chokidarOptions: {
        awaitWriteFinish: false,
        usePolling: true,
        interval: 100,
      },
    });
    await watcher.start();
    watcher.stop();
    watcher.stop();
    expect(watcher.running).toBe(false);
  });
});
