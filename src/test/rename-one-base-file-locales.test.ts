import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { ResolvedConfig } from "../core/types";
import { createLocaleSource } from "../lib/create-locale-source";
import { renameOneBaseFileLocales } from "../lib/rename-one-base-file-locales";

describe("renameOneBaseFileLocales", () => {
  let root: string | undefined;

  afterEach(() => {
    if (root) {
      rmSync(root, { recursive: true, force: true });
      root = undefined;
    }
  });

  function createConfig(): ResolvedConfig {
    root = join(tmpdir(), `rename-one-base-file-locales-${Date.now()}`);
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

  it("输入不合法的文件名时，直接返回 undefined", () => {
    const config = createConfig();
    const result = renameOneBaseFileLocales(config, "invalid.js", "valid.js");
    expect(result).toBeUndefined();
  });

  it("输入合法的文件名，但新旧文件名一样时，直接返回空数组", () => {
    const config = createConfig();
    const result = renameOneBaseFileLocales(config, "user.ts", "user.ts");
    expect(result).toEqual([]);
  });

  it("各 locale 目录下旧文件存在，但新文件不存在", () => {
    const config = createConfig();
    // 准备前提条件，对 config.locales 每个 locale 目录 准备一份 旧文件
    for (const locale of config.locales) {
      const oldFile = join(config.i18nDir, locale, "user.ts");
      mkdirSync(dirname(oldFile), { recursive: true });
      writeFileSync(oldFile, "export default {};");
    }
    const result = renameOneBaseFileLocales(
      config,
      "user.ts",
      "user-management.ts"
    );
    // 断言1:旧路径都不存在，新路径都存在
    for (const locale of config.locales) {
      const oldFile = join(config.i18nDir, locale, "user.ts");
      const newFile = join(config.i18nDir, locale, "user-management.ts");
      expect(existsSync(oldFile)).toBe(false);
      expect(existsSync(newFile)).toBe(true);
    }

    // 断言2: 每个新文件内容与 createLocaleSource(新 namespace， 新typeName) 一致
    for (const locale of config.locales) {
      const newFile = join(config.i18nDir, locale, "user-management.ts");
      expect(readFileSync(newFile, "utf-8")).toBe(
        createLocaleSource("user-management", "UserManagementMessage")
      );
    }

    // 断言3: 返回值里的renamedFiles 条数 等于 发生过 renameSync 的语言数
    expect(result).toHaveLength(config.locales.length);
    for (const locale of config.locales) {
      const from = join(config.i18nDir, locale, "user.ts");
      const to = join(config.i18nDir, locale, "user-management.ts");
      expect(
        result?.find((item) => item.from === from && item.to === to)
      ).toBeDefined();
    }
  });

  it("从未生成过 locale 文件时，每个 locale 目录下出现新的 to 路径， renameFiles 应该是 空数组", () => {
    const config = createConfig();
    const result = renameOneBaseFileLocales(config, "user.ts", "user-management.ts");
    expect(result).toEqual([]);
    for (const locale of config.locales) {
      const newFile = join(config.i18nDir, locale, "user-management.ts");
      // 判断新文件是否存在
      expect(existsSync(newFile)).toBe(true);
    }
  });
})
