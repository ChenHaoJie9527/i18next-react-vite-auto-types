import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { I18nextKitError } from "../core";
import { generateAll } from "../core/orchestrate";

const commonLocaleSource = `import type { CommonMessage } from "../base/common";

export default {} satisfies CommonMessage;
`;

const userManagementLocaleSource = `import type { UserManagementMessage } from "../base/user-management";

export default {} satisfies UserManagementMessage;
`;

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

  writeFileSync(join(enDir, "common.ts"), commonLocaleSource);
  writeFileSync(join(enDir, "user-management.ts"), userManagementLocaleSource);
  writeFileSync(join(zhDir, "common.ts"), commonLocaleSource);
  writeFileSync(join(zhDir, "user-management.ts"), userManagementLocaleSource);

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

  it("writes the four generated artifacts", () => {
    const fixture = makeFixture();
    root = fixture.root;

    const result = generateAll({
      root: fixture.root,
      i18nDir: "src/i18n",
      outDir: "generated",
      locales: ["en-US", "zh-CN"],
      mode: "folder",
      scaffold: false,
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

  it("does not rewrite unchanged files", () => {
    const fixture = makeFixture();
    root = fixture.root;

    const first = generateAll({
      root: fixture.root,
      i18nDir: "src/i18n",
      outDir: "generated",
      locales: ["en-US", "zh-CN"],
      mode: "folder",
      scaffold: false,
    });

    const second = generateAll({
      root: fixture.root,
      i18nDir: "src/i18n",
      outDir: "generated",
      locales: ["en-US", "zh-CN"],
      mode: "folder",
      scaffold: false,
    });

    expect(first.writtenFiles).toHaveLength(4);
    expect(second.writtenFiles).toEqual([]);
  });

  it("syncs missing locale files before validation and generation", () => {
    const fixture = makeFixture();
    root = fixture.root;
    const missingFile = join(fixture.i18nDir, "zh-CN", "user-management.ts");
    rmSync(missingFile);

    const result = generateAll({
      root: fixture.root,
      i18nDir: "src/i18n",
      outDir: "generated",
      locales: ["en-US", "zh-CN"],
      mode: "folder",
      scaffold: false,
    });

    expect(result.validation.ok).toBe(true);
    expect(result.validation.issues).toEqual([]);
    expect(result.writtenFiles).toEqual(expect.arrayContaining([missingFile]));
    expect(existsSync(missingFile)).toBe(true);
  });

  it("reports missing locale directories when only base exists", () => {
    root = mkdtempSync(join(tmpdir(), "i18next-kit-orchestrate-partial-"));
    const i18nDir = join(root, "src", "i18n");
    const baseDir = join(i18nDir, "base");
    mkdirSync(baseDir, { recursive: true });

    const result = generateAll({
      root,
      i18nDir: "src/i18n",
      locales: ["en-US", "zh-CN"],
      mode: "folder",
      scaffold: false,
    });

    expect(result.validation.ok).toBe(false);
    expect(result.validation.issues).toEqual(
      expect.arrayContaining([
        { code: "NO_CONTRACT_NAMESPACE", locale: "", namespace: "" },
        { code: "LOCALE_DIR_MISSING", locale: "en-US", namespace: "" },
        { code: "LOCALE_DIR_MISSING", locale: "zh-CN", namespace: "" },
      ])
    );
    expect(result.validation.issues).toHaveLength(3);
  });

  it("throws I18N_DIR_NOT_FOUND when i18n is missing", () => {
    root = mkdtempSync(join(tmpdir(), "i18next-kit-orchestrate-no-i18n-"));
    expect(() =>
      generateAll({
        root,
        i18nDir: "src/i18n",
        locales: ["en-US"],
        mode: "folder",
        scaffold: false,
      })
    ).toThrow(I18nextKitError);

    try {
      generateAll({
        root,
        i18nDir: "src/i18n",
        locales: ["en-US"],
        mode: "folder",
        scaffold: false,
      });
    } catch (e) {
      expect(e).toMatchObject({
        code: "I18N_DIR_NOT_FOUND",
      });
    }
  });

  it("throws CONTRACTS_DIR_NOT_FOUND when base is missing", () => {
    root = mkdtempSync(join(tmpdir(), "i18next-kit-orchestrate-no-base-"));
    mkdirSync(join(root, "src", "i18n"), { recursive: true });

    expect(() =>
      generateAll({
        root,
        i18nDir: "src/i18n",
        locales: ["en-US"],
        mode: "folder",
        scaffold: false,
      })
    ).toThrow(I18nextKitError);

    try {
      generateAll({
        root,
        i18nDir: "src/i18n",
        locales: ["en-US"],
        mode: "folder",
        scaffold: false,
      });
    } catch (e) {
      expect(e).toMatchObject({ code: "CONTRACTS_DIR_NOT_FOUND" });
    }
  });
});
