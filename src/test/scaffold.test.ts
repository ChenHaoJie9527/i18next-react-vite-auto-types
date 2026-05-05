import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateAll } from "../core/orchestrate";
import { SCAFFOLD_MARKER } from "../core/scaffold";

describe("prepareI18nScaffold（经 generateAll 默认路径）", () => {
  let root: string | undefined;

  afterEach(() => {
    if (root) {
      rmSync(root, { recursive: true, force: true });
      root = undefined;
    }
  });

  it("空项目在默认 src/i18n 下写入最小模板并校验通过", () => {
    root = mkdtempSync(join(tmpdir(), "i18next-kit-scaffold-empty-"));
    const result = generateAll({
      root,
      locales: ["en-US"],
      mode: "folder",
    });
    const i18n = join(root, "src", "i18n");
    expect(existsSync(join(i18n, "base", "common.ts"))).toBe(true);
    expect(existsSync(join(i18n, "en-US", "common.ts"))).toBe(true);
    expect(existsSync(join(i18n, SCAFFOLD_MARKER))).toBe(true);
    expect(result.validation.ok).toBe(true);
  });

  it("仅有 locale 子目录且无 base 时在 src/new-locale 下脚手架", () => {
    root = mkdtempSync(join(tmpdir(), "i18next-kit-scaffold-locale-only-"));
    const i18n = join(root, "src", "i18n");
    mkdirSync(join(i18n, "en-US"), { recursive: true });
    const result = generateAll({
      root,
      i18nDir: "src/i18n",
      locales: ["en-US"],
      mode: "folder",
    });
    const alt = join(root, "src", "new-locale");
    expect(existsSync(join(alt, "base", "common.ts"))).toBe(true);
    expect(existsSync(join(alt, "en-US", "common.ts"))).toBe(true);
    expect(existsSync(join(alt, SCAFFOLD_MARKER))).toBe(true);
    expect(result.validation.ok).toBe(true);
  });

  it("i18n 下已有非 locale 独占内容时在 src/new-i18n 下脚手架", () => {
    root = mkdtempSync(join(tmpdir(), "i18next-kit-scaffold-occupied-"));
    const i18n = join(root, "src", "i18n");
    mkdirSync(i18n, { recursive: true });
    writeFileSync(join(i18n, "notes.txt"), "x");
    const result = generateAll({
      root,
      i18nDir: "src/i18n",
      locales: ["en-US"],
      mode: "folder",
    });
    const alt = join(root, "src", "new-i18n");
    expect(existsSync(join(alt, "base", "common.ts"))).toBe(true);
    expect(existsSync(join(alt, "en-US", "common.ts"))).toBe(true);
    expect(result.validation.ok).toBe(true);
  });
});
