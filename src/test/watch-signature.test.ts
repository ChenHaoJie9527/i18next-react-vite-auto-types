import { describe, expect, it } from "vitest";
import type { ResolvedConfig } from "../core/types";
import { createI18nWatchSignature } from "../plugin/watch-signature";

describe("createI18nWatchSignature", () => {
  const config: ResolvedConfig = {
    root: "D:/project",
    framework: "vite",
    i18nDir: "D:/project/src/i18n",
    contractsDir: "D:/project/src/i18n/base",
    outDir: "D:/project/src/i18n",
    locales: ["zh-CN", "en-US"],
    mode: "folder",
  };

  it("uses i18n directory, contracts directory, and sorted locales", () => {
    expect(createI18nWatchSignature(config)).toBe(
      JSON.stringify({
        contractsDir: "D:/project/src/i18n/base",
        i18nDir: "D:/project/src/i18n",
        locales: ["en-US", "zh-CN"],
      })
    );
  });

  it("is stable when locale order changes", () => {
    const reordered: ResolvedConfig = {
      ...config,
      locales: ["en-US", "zh-CN"],
    };

    expect(createI18nWatchSignature(reordered)).toBe(
      createI18nWatchSignature(config)
    );
  });
});
