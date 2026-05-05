import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { scanLocalesFolder } from "../core/scan-locales-folder";

type ScanEntry = { locale: string; namespace: string };

/*
 * @description 对扫描结果进行排序，先按 locale 排序，再按 namespace 排序
 * @param entries - 扫描结果
 * @example
 * ```ts
 * const entries = [
 *   { locale: "en-US", namespace: "common" },
 *   { locale: "en-US", namespace: "user-management" },
 *   { locale: "zh-CN", namespace: "common" },
 *   { locale: "zh-CN", namespace: "user-management" },
 * ];
 * sortEntries(entries);
 * // 结果：
 * [
 *   { locale: "en-US", namespace: "common" },
 *   { locale: "en-US", namespace: "user-management" },
 *   { locale: "zh-CN", namespace: "common" },
 *   { locale: "zh-CN", namespace: "user-management" },
 * ]
 * ```
 * @returns - 排序后的扫描结果
 */
function sortEntries(entries: ScanEntry[]): ScanEntry[] {
  return [...entries].sort((a, b) =>
    a.locale === b.locale
      ? a.namespace.localeCompare(b.namespace)
      : a.locale.localeCompare(b.locale)
  );
}

describe("scanLocalesFolder", () => {
  let root: string | undefined;

  // 每次测试结束后删除临时目录
  afterEach(() => {
    if (root) {
      rmSync(root, { recursive: true, force: true });
      root = undefined;
    }
  });

  it("locales 为空时返回空数组", () => {
    root = join(tmpdir(), `scan-locales-empty-${Date.now()}`);
    // 创建临时目录, recursive: true 表示创建多级目录
    mkdirSync(root, { recursive: true });

    const result = scanLocalesFolder(root, []);

    expect(result).toEqual({ files: [], missingLocaleDirs: [] });
  });

  it("单个语言目录：只收录 .ts，去掉扩展名；排除 .d.ts 与非 .ts", () => {
    root = join(tmpdir(), `scan-locales-one-${Date.now()}`);
    // 访问临时目录下的 i18n 目录
    const i18nDir = join(root, "i18n");
    // 访问临时目录下的 i18n 目录下的 en-US 目录
    const en = join(i18nDir, "en-US");
    // 创建 en-US 目录
    mkdirSync(en, { recursive: true });
    // 创建 common.ts 文件
    writeFileSync(join(en, "common.ts"), "export default {}");
    // 创建 user-management.ts 文件
    writeFileSync(join(en, "user-management.ts"), "export default {}");
    // 创建 types.d.ts 文件
    writeFileSync(join(en, "types.d.ts"), "export {}");
    // 创建 readme.md 文件
    writeFileSync(join(en, "readme.md"), "#");
    // 扫描 i18n 目录下的 en-US 目录
    const result = scanLocalesFolder(i18nDir, ["en-US"]);
    // 对扫描结果进行排序
    expect(sortEntries(result.files)).toEqual(
      sortEntries([
        { locale: "en-US", namespace: "common" },
        { locale: "en-US", namespace: "user-management" },
      ])
    );
    expect(result.missingLocaleDirs).toEqual([]);
  });

  it("多个语言目录：按 locales 顺序遍历，合并为 locale + namespace 列表", () => {
    root = join(tmpdir(), `scan-locales-multi-${Date.now()}`);
    const i18nDir = join(root, "i18n");
    mkdirSync(join(i18nDir, "zh-CN"), { recursive: true });
    mkdirSync(join(i18nDir, "en-US"), { recursive: true });
    mkdirSync(join(i18nDir, "zh-HK"), { recursive: true });
    // i18n/zh-CN/a.ts
    writeFileSync(join(i18nDir, "zh-CN", "a.ts"), "export default {}");
    // i18n/en-US/b.ts
    writeFileSync(join(i18nDir, "en-US", "b.ts"), "export default {}");
    // i18n/zh-HK/c.ts
    writeFileSync(join(i18nDir, "zh-HK", "c.ts"), "export default {}");

    const result = scanLocalesFolder(i18nDir, ["zh-CN", "en-US", "zh-HK"]);

    expect(sortEntries(result.files)).toEqual(
      sortEntries([
        { locale: "zh-CN", namespace: "a" },
        { locale: "en-US", namespace: "b" },
        { locale: "zh-HK", namespace: "c" },
      ])
    );
    expect(result.missingLocaleDirs).toEqual([]);
  });

  it("某语言目录下无 .ts 源文件时，该语言不产生条目", () => {
    root = join(tmpdir(), `scan-locales-only-dts-${Date.now()}`);
    const i18nDir = join(root, "i18n");
    const ja = join(i18nDir, "ja-JP");
    mkdirSync(ja, { recursive: true });
    writeFileSync(join(ja, "only.d.ts"), "export {}");

    expect(scanLocalesFolder(i18nDir, ["ja-JP"])).toEqual({
      files: [],
      missingLocaleDirs: [],
    });
  });

  it("locale 子目录不存在时记入 missingLocaleDirs", () => {
    root = join(tmpdir(), `scan-locales-missing-${Date.now()}`);
    const i18nDir = join(root, "i18n");
    mkdirSync(join(i18nDir, "en-US"), { recursive: true });
    writeFileSync(join(i18nDir, "en-US", "common.ts"), "export default {}");

    const result = scanLocalesFolder(i18nDir, ["en-US", "zh-CN"]);
    expect(sortEntries(result.files)).toEqual([
      { locale: "en-US", namespace: "common" },
    ]);
    expect(result.missingLocaleDirs).toEqual(["zh-CN"]);
  });

  it("遍历每个 locale 目录，返回（locale, namespace）对", () => {
    // 创建一个临时的i18n目录
    const root = mkdtempSync(join(tmpdir(), "i18n-"));
    const locales = ["en-US", "zh-CN", "zh-HK"];
    for (const locale of locales) {
      // i18n/en-US、i18n/zh-CN、i18n/zh-HK
      mkdirSync(join(root, locale), { recursive: true });
      writeFileSync(join(root, locale, "common.ts"), "export default {}");
      writeFileSync(
        join(root, locale, "user-management.ts"),
        "export default {}"
      );
      writeFileSync(join(root, locale, "file.ts"), "export default {}");
    }

    const reuslt = scanLocalesFolder(root, locales);
    expect(reuslt.files).toEqual(
      expect.arrayContaining([
        {
          locale: "en-US",
          namespace: "common",
        },
        {
          locale: "en-US",
          namespace: "user-management",
        },
        {
          locale: "en-US",
          namespace: "file",
        },
        {
          locale: "zh-CN",
          namespace: "common",
        },
        {
          locale: "zh-CN",
          namespace: "user-management",
        },
        {
          locale: "zh-CN",
          namespace: "file",
        },
        {
          locale: "zh-HK",
          namespace: "common",
        },
        {
          locale: "zh-HK",
          namespace: "user-management",
        },
        {
          locale: "zh-HK",
          namespace: "file",
        },
      ])
    );
    expect(reuslt.missingLocaleDirs).toEqual([]);
  });
});
