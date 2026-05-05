import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../core/resolve-config";
import { isKitWatchPath, toWatchAbsolutePath } from "../plugin/watch";

function fakeServer(root: string) {
  return {
    config: { root },
  } as import("vite").ViteDevServer;
}

describe("plugin watch path helpers", () => {
  let root: string | undefined;

  afterEach(() => {
    if (root) {
      rmSync(root, { recursive: true, force: true });
      root = undefined;
    }
  });

  it("toWatchAbsolutePath 将相对路径接到 Vite root 上", () => {
    root = mkdtempSync(join(tmpdir(), "i18next-kit-watch-abs-"));
    const server = fakeServer(root);
    expect(toWatchAbsolutePath(server, "src/i18n/base/foo.ts")).toBe(
      join(root, "src/i18n/base/foo.ts")
    );
  });

  it("isKitWatchPath 对相对解析后的绝对路径仍成立", () => {
    root = mkdtempSync(join(tmpdir(), "i18next-kit-watch-kit-"));
    mkdirSync(join(root, "src", "i18n", "base"), { recursive: true });
    const resolved = resolveConfig({
      root,
      locales: ["en-US"],
      mode: "folder",
    });
    const relUnderRoot = join("src", "i18n", "base", "common.ts");
    const abs = join(root, relUnderRoot);
    expect(isKitWatchPath(abs, resolved)).toBe(true);
  });
});
