import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateAll } from "../core/orchestrate";

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), "i18next-kit-orchestrate-"));
  const i18nDir = join(root, "src", "i18n");
  const baseDir = join(i18nDir, "base");
  const enDir = join(i18nDir, "en-US");
  const zhDir = join(i18nDir, "zh-CN");
  const outDir = join(root, "generated");

  mkdirSync(baseDir, { recursive: true });
  mkdirSync(enDir, { recursive: true });
  mkdirSync(zhDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });

  writeFileSync(join(baseDir, "common.ts"), "export type CommonMessage = {};");
  writeFileSync(
    join(baseDir, "user-management.ts"),
    "export type UserManagementMessage = {};"
  );

  writeFileSync(join(enDir, "common.ts"), "export default {};");
  writeFileSync(join(enDir, "user-management.ts"), "export default {};");
  writeFileSync(join(zhDir, "common.ts"), "export default {};");
  writeFileSync(join(zhDir, "user-management.ts"), "export default {};");

  return { root, i18nDir, outDir };
}

describe("generateAll", () => {
  let root: string | undefined;

  afterEach(() => {
    if (root) {
      rmSync(root, { recursive: true, force: true });
      root = undefined;
    }
  });

  it("会生成 4 个文件并返回通过的校验结果", () => {
    const fixture = makeFixture();
    root = fixture.root;

    const result = generateAll({
      root: fixture.root,
      i18nDir: "src/i18n",
      outDir: "generated",
      locales: ["en-US", "zh-CN"],
      mode: "folder",
    });

    expect(result.validation.ok).toBe(true);
    expect(result.validation.issues).toEqual([]);
    expect(result.writtenFiles).toHaveLength(4);
    expect(result.writtenFiles).toEqual(
      expect.arrayContaining([
        join(fixture.outDir, "generated-resources.ts"),
        join(fixture.outDir, "contracts.ts"),
        join(fixture.outDir, "generated-runtime.ts"),
        join(fixture.outDir, "i18next.d.ts"),
      ])
    );
    expect(
      readFileSync(join(fixture.outDir, "generated-resources.ts"), "utf-8")
    ).toContain("resourceNamespaces");
    expect(
      readFileSync(join(fixture.outDir, "contracts.ts"), "utf-8")
    ).toContain("export const contracts");
    expect(
      readFileSync(join(fixture.outDir, "generated-runtime.ts"), "utf-8")
    ).toContain("initI18n");
    expect(
      readFileSync(join(fixture.outDir, "i18next.d.ts"), "utf-8")
    ).toContain("declare module 'i18next'");
  });

  it("第二次执行相同输入时 writtenFiles 为空", () => {
    const fixture = makeFixture();
    root = fixture.root;

    const first = generateAll({
      root: fixture.root,
      i18nDir: "src/i18n",
      outDir: "generated",
      locales: ["en-US", "zh-CN"],
      mode: "folder",
    });

    const second = generateAll({
      root: fixture.root,
      i18nDir: "src/i18n",
      outDir: "generated",
      locales: ["en-US", "zh-CN"],
      mode: "folder",
    });

    expect(first.writtenFiles).toHaveLength(4);
    expect(second.writtenFiles).toEqual([]);
  });

  it("缺少 locale 文件时仍返回 validation 问题并继续生成", () => {
    const fixture = makeFixture();
    root = fixture.root;
    rmSync(join(fixture.i18nDir, "zh-CN", "user-management.ts"));

    const result = generateAll({
      root: fixture.root,
      i18nDir: "src/i18n",
      outDir: "generated",
      locales: ["en-US", "zh-CN"],
      mode: "folder",
    });

    expect(result.validation.ok).toBe(false);
    expect(result.validation.issues).toContainEqual({
      code: "MISSING_LOCALE_FILE",
      locale: "zh-CN",
      namespace: "user-management",
    });
    expect(result.writtenFiles).toHaveLength(4);
  });
});
