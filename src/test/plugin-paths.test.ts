import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../core/resolve-config";
import { isGeneratedFile, isSourceFile } from "../plugin/paths";
import { isKitWatchPath } from "../plugin/watch";

describe("plugin paths", () => {
  let root: string | undefined;

  afterEach(() => {
    if (root) {
      rmSync(root, { recursive: true, force: true });
      root = undefined;
    }
  });

  it("将 base 与 locale 下的 .ts 识别为 i18n 源文件", () => {
    root = mkdtempSync(join(tmpdir(), "i18next-kit-plugin-paths-"));
    const i18nDir = join(root, "src", "i18n");
    const baseDir = join(i18nDir, "base");
    const enDir = join(i18nDir, "en-US");
    mkdirSync(baseDir, { recursive: true });
    mkdirSync(enDir, { recursive: true });
    writeFileSync(
      join(baseDir, "common.ts"),
      "export type CommonMessage = {};"
    );
    writeFileSync(join(enDir, "common.ts"), "export default {};");

    const resolved = resolveConfig({
      root,
      locales: ["en-US"],
      mode: "folder",
    });

    expect(isSourceFile(join(baseDir, "common.ts"), resolved)).toBe(true);
    expect(isSourceFile(join(enDir, "common.ts"), resolved)).toBe(true);
  });

  it("将 outDir 下的 contracts.ts 识别为生成物而非源文件", () => {
    root = mkdtempSync(join(tmpdir(), "i18next-kit-plugin-paths-"));
    const i18nDir = join(root, "src", "i18n");
    mkdirSync(join(i18nDir, "base"), { recursive: true });
    mkdirSync(join(i18nDir, "en-US"), { recursive: true });
    writeFileSync(join(i18nDir, "base", "common.ts"), "export type X = {};");
    writeFileSync(join(i18nDir, "en-US", "common.ts"), "export default {};");

    const resolved = resolveConfig({
      root,
      locales: ["en-US"],
      mode: "folder",
    });
    const contractsPath = join(resolved.outDir, "contracts.ts");
    writeFileSync(contractsPath, "export const x = 1;");

    expect(isGeneratedFile(contractsPath, resolved)).toBe(true);
    expect(isSourceFile(contractsPath, resolved)).toBe(false);
  });

  it("非 i18n 树内文件不是源文件", () => {
    root = mkdtempSync(join(tmpdir(), "i18next-kit-plugin-paths-"));
    const i18nDir = join(root, "src", "i18n");
    mkdirSync(join(i18nDir, "base"), { recursive: true });
    mkdirSync(join(i18nDir, "en-US"), { recursive: true });
    writeFileSync(join(i18nDir, "base", "common.ts"), "export type X = {};");
    writeFileSync(join(i18nDir, "en-US", "common.ts"), "export default {};");
    writeFileSync(join(root, "src", "main.ts"), "export {}");

    const resolved = resolveConfig({
      root,
      locales: ["en-US"],
      mode: "folder",
    });

    expect(isSourceFile(join(root, "src", "main.ts"), resolved)).toBe(false);
  });

  it("isKitWatchPath：i18n 内文件与 i18n 的父级目录均视为相关", () => {
    root = mkdtempSync(join(tmpdir(), "i18next-kit-watch-path-"));
    const i18nDir = join(root, "src", "i18n");
    const resolved = resolveConfig({
      root,
      locales: ["en-US"],
      mode: "folder",
    });

    expect(isKitWatchPath(join(root, "src"), resolved)).toBe(true);
    expect(isKitWatchPath(i18nDir, resolved)).toBe(true);
    expect(isKitWatchPath(join(i18nDir, "base", "a.ts"), resolved)).toBe(true);
    expect(isKitWatchPath(join(root, "other", "x.ts"), resolved)).toBe(false);
  });
});
