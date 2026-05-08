import { describe, it, expect, afterEach } from "vitest";
import { deleteOneBaseFileLocales } from "../lib/delete-one-base-file-locales";
import { join } from "node:path";
import type { ResolvedConfig } from "../core/types";
import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

describe("deleteOneBaseFileLocales", () => {
  let root: string | undefined;

  afterEach(() => {
    if (root) {
      rmSync(root, { recursive: true, force: true });
      root = undefined;
    }
  });

  function createConfig(): ResolvedConfig {
    root = join(tmpdir(), `delete-one-base-file-locales-${Date.now()}`);

    return {
      contractsDir: join(root, "contracts"),
      framework: "vite",
      i18nDir: join(root, "i18n"),
      locales: ["en-US", "zh-CN"],
      mode: "folder",
      outDir: join(root, "out"),
      root,
    };
  }
  it("删除对应的 locale 文件", () => {
    const config = createConfig();
    const file = join(config.contractsDir, "base", "user-management.ts");

    deleteOneBaseFileLocales(config, file);
    // 判断文件是否存在
    expect(existsSync(join(config.i18nDir, "en-US", "user-management.ts"))).toBe(false);
    expect(existsSync(join(config.i18nDir, "zh-CN", "user-management.ts"))).toBe(false);
  });
});
