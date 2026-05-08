import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { ResolvedConfig } from "../core/types";
import { deleteOneBaseFileLocales } from "../lib/delete-one-base-file-locales";

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
    const expectedFiles = [
      join(config.i18nDir, "en-US", "user-management.ts"),
      join(config.i18nDir, "zh-CN", "user-management.ts"),
    ];

    for (const localeFile of expectedFiles) {
      mkdirSync(dirname(localeFile), { recursive: true });
      writeFileSync(localeFile, "export default {};");
    }

    const result = deleteOneBaseFileLocales(config, file);

    expect(result).toEqual(expectedFiles);
    for (const localeFile of expectedFiles) {
      expect(existsSync(localeFile)).toBe(false);
    }
  });
});
