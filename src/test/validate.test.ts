import { describe, expect, it } from "vitest";
import { validate } from "../core";

describe("validate", () => {
  it("命名空间、语言文件和语言列表完全匹配时通过校验", () => {
    const report = validate(
      [{ name: "common" }, { name: "user-management" }],
      [
        { locale: "en-US", namespace: "common" },
        { locale: "en-US", namespace: "user-management" },
        { locale: "zh-CN", namespace: "common" },
        { locale: "zh-CN", namespace: "user-management" },
        { locale: "zh-HK", namespace: "common" },
        { locale: "zh-HK", namespace: "user-management" },
      ],
      ["en-US", "zh-CN", "zh-HK"]
    );

    expect(report).toEqual({
      ok: true,
      issues: [],
    });
  });

  it("缺少期望的语言文件时返回 MISSING_LOCALE_FILE", () => {
    const report = validate(
      [{ name: "common" }, { name: "user-management" }],
      [{ locale: "en-US", namespace: "common" }],
      ["en-US"]
    );

    expect(report).toEqual({
      ok: false,
      issues: [
        {
          code: "MISSING_LOCALE_FILE",
          locale: "en-US",
          namespace: "user-management",
        },
      ],
    });
  });

  it("存在不属于命名空间列表的语言文件时返回 EXTRA_LOCALE_FILE", () => {
    const report = validate(
      [{ name: "common" }],
      [
        { locale: "en-US", namespace: "common" },
        { locale: "en-US", namespace: "legacy" },
      ],
      ["en-US"]
    );

    expect(report).toEqual({
      ok: false,
      issues: [
        {
          code: "EXTRA_LOCALE_FILE",
          locale: "en-US",
          namespace: "legacy",
        },
      ],
    });
  });

  it("同时存在缺失和多余语言文件时返回完整 issues", () => {
    const report = validate(
      [{ name: "common" }, { name: "profile" }],
      [
        { locale: "en-US", namespace: "common" },
        { locale: "zh-CN", namespace: "legacy" },
      ],
      ["en-US", "zh-CN"]
    );

    expect(report).toEqual({
      ok: false,
      issues: [
        {
          code: "MISSING_LOCALE_FILE",
          locale: "en-US",
          namespace: "profile",
        },
        {
          code: "MISSING_LOCALE_FILE",
          locale: "zh-CN",
          namespace: "common",
        },
        {
          code: "MISSING_LOCALE_FILE",
          locale: "zh-CN",
          namespace: "profile",
        },
        {
          code: "EXTRA_LOCALE_FILE",
          locale: "zh-CN",
          namespace: "legacy",
        },
      ],
    });
  });
});
