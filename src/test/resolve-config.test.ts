import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveConfig } from "../core/resolve-config";
import { I18nextKitError, type I18nextKitMode } from "../core/types";

describe("resolveConfig", () => {
  it("locales 为空数组时抛 INVALID_CONFIG", () => {
    try {
      resolveConfig({ locales: [], mode: "folder" });
    } catch (error) {
      expect(error).toBeInstanceOf(I18nextKitError);
      expect(error).toMatchObject({
        code: "INVALID_CONFIG",
        detail: {},
        message: "[INVALID_CONFIG] locales 不能为空数组",
      });
    }
  });

  it("mode 为空时抛 INVALID_CONFIG", () => {
    try {
      resolveConfig({ locales: ["en-US"], mode: "unknown" as I18nextKitMode });
    } catch (error) {
      expect(error).toBeInstanceOf(I18nextKitError);
      expect(error).toMatchObject({
        code: "INVALID_CONFIG",
        detail: {},
        message: "[INVALID_CONFIG] 未知 mode: unknown",
      });
    }
  });

  it("mode 为 file 时抛 INVALID_CONFIG", () => {
    try {
      resolveConfig({ locales: ["en-US"], mode: "file" as I18nextKitMode });
    } catch (error) {
      expect(error).toBeInstanceOf(I18nextKitError);
      expect(error).toMatchObject({
        code: "INVALID_CONFIG",
        detail: {},
        message: "[INVALID_CONFIG] mode: 'file' 暂未实现，请使用 'folder' 模式",
      });
    }
  });

  it("root 为空时使用当前工作目录", () => {
    const result = resolveConfig({ locales: ["en-US"], mode: "folder" });
    expect(result).toMatchObject({
      root: process.cwd(),
      i18nDir: resolve(process.cwd(), "src/i18n"),
    });
  });

  it("root 为非空时使用传入的 root", () => {
    const result = resolveConfig({
      locales: ["en-US"],
      mode: "folder",
      root: "test",
    });
    expect(result).toMatchObject({
      root: resolve("test"),
      i18nDir: resolve("test", "src/i18n"),
    });
  });

  it("i18nDir 为空时使用 'src/i18n'", () => {
    const result = resolveConfig({
      locales: ["en-US"],
      mode: "folder",
      i18nDir: undefined,
    });
    expect(result).toMatchObject({
      i18nDir: resolve(process.cwd(), "src/i18n"),
    });
  });

  it("i18nDir 为非空时使用传入的 i18nDir", () => {
    const result = resolveConfig({
      locales: ["en-US"],
      mode: "folder",
      i18nDir: "test/i18n",
    });
    expect(result).toMatchObject({
      i18nDir: resolve("test", "i18n"),
    });
  });

  it("i18nDir 为相对路径时使用相对于 root 的绝对路径", () => {
    const result = resolveConfig({
      locales: ["en-US"],
      mode: "folder",
      i18nDir: "test/i18n",
    });
    expect(result).toMatchObject({
      i18nDir: resolve(process.cwd(), "test/i18n"),
    });
  });

  it("contractsDir 为空时使用 'base'", () => {
    const result = resolveConfig({
      locales: ["en-US"],
      mode: "folder",
      i18nDir: "test/i18n",
      contractsDir: undefined,
    });
    expect(result).toMatchObject({
      contractsDir: resolve("test", "i18n", "base"),
    });
  });

  it("contractsDir 为非空时使用传入的 contractsDir，并转换为相对于 i18nDir 的相对路径", () => {
    const result = resolveConfig({
      locales: ["en-US"],
      mode: "folder",
      i18nDir: "test/i18n",
      contractsDir: "contracts",
    });
    expect(result).toMatchObject({
      contractsDir: resolve(process.cwd(), "test/i18n/contracts"),
    });
  });
});
