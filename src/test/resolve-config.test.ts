import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveConfig } from "../core/resolve-config";
import {
  type I18nextKitConfig,
  I18nextKitError,
  type I18nextKitMode,
} from "../core/types";

function captureResolveConfigError(config: I18nextKitConfig) {
  try {
    resolveConfig(config);
  } catch (error) {
    return error;
  }

  throw new Error("Expected resolveConfig to throw");
}

describe("resolveConfig", () => {
  it("locales 为空数组时抛 INVALID_CONFIG", () => {
    const error = captureResolveConfigError({ locales: [], mode: "folder" });

    expect(error).toBeInstanceOf(I18nextKitError);
    expect(error).toMatchObject({
      code: "INVALID_CONFIG",
      detail: {},
      message: "[INVALID_CONFIG] locales 不能为空数组",
    });
  });

  it("mode 非 folder/file 时抛 INVALID_CONFIG", () => {
    const error = captureResolveConfigError({
      locales: ["en-US"],
      mode: "unknown" as I18nextKitMode,
    });

    expect(error).toBeInstanceOf(I18nextKitError);
    expect(error).toMatchObject({
      code: "INVALID_CONFIG",
      detail: {},
      message: "[INVALID_CONFIG] 未知 mode: unknown",
    });
  });

  it("mode 为 file 时抛 INVALID_CONFIG", () => {
    const error = captureResolveConfigError({
      locales: ["en-US"],
      mode: "file",
    });

    expect(error).toBeInstanceOf(I18nextKitError);
    expect(error).toMatchObject({
      code: "INVALID_CONFIG",
      detail: {},
      message: "[INVALID_CONFIG] mode: 'file' 暂未实现，请使用 'folder' 模式",
    });
  });

  it("配置路径为空时使用默认路径", () => {
    const result = resolveConfig({ locales: ["en-US"], mode: "folder" });

    expect(result).toEqual({
      root: process.cwd(),
      i18nDir: resolve(process.cwd(), "src/i18n"),
      contractsDir: resolve(process.cwd(), "src/i18n", "base"),
      outDir: resolve(process.cwd(), "src/i18n"),
      locales: ["en-US"],
      mode: "folder",
    });
  });

  it("root 为相对路径时转换为绝对路径", () => {
    const result = resolveConfig({
      locales: ["en-US"],
      mode: "folder",
      root: "test",
    });

    expect(result).toMatchObject({
      root: resolve("test"),
      i18nDir: resolve("test", "src/i18n"),
      contractsDir: resolve("test", "src/i18n", "base"),
      outDir: resolve("test", "src/i18n"),
    });
  });

  it("i18nDir 为相对路径时基于 root 转换为绝对路径", () => {
    const result = resolveConfig({
      root: "project",
      locales: ["en-US"],
      mode: "folder",
      i18nDir: "test/i18n",
    });

    expect(result.i18nDir).toBe(resolve("project", "test/i18n"));
  });

  it("contractsDir 为空时基于 i18nDir 使用 base", () => {
    const result = resolveConfig({
      locales: ["en-US"],
      mode: "folder",
      i18nDir: "test/i18n",
      contractsDir: undefined,
    });

    expect(result.contractsDir).toBe(resolve("test", "i18n", "base"));
  });

  it("contractsDir 为相对路径时基于 i18nDir 转换为绝对路径", () => {
    const result = resolveConfig({
      locales: ["en-US"],
      mode: "folder",
      i18nDir: "test/i18n",
      contractsDir: "contracts",
    });

    expect(result.contractsDir).toBe(resolve("test", "i18n", "contracts"));
  });

  it("contractsDir 为绝对路径时原样使用", () => {
    const contractsDir = resolve(process.cwd(), "custom/base");
    const result = resolveConfig({
      locales: ["en-US"],
      mode: "folder",
      i18nDir: "test/i18n",
      contractsDir,
    });

    expect(result.contractsDir).toBe(contractsDir);
  });

  it("outDir 为空时使用 i18nDir", () => {
    const result = resolveConfig({
      locales: ["en-US"],
      mode: "folder",
      i18nDir: "test/i18n",
      outDir: undefined,
    });

    expect(result.outDir).toBe(resolve("test", "i18n"));
  });

  it("outDir 为相对路径时基于 root 转换为绝对路径", () => {
    const result = resolveConfig({
      root: "project",
      locales: ["en-US"],
      mode: "folder",
      outDir: "generated",
    });

    expect(result.outDir).toBe(resolve("project", "generated"));
  });

  it("完整配置时返回解析后的 ResolvedConfig", () => {
    const result = resolveConfig({
      root: "project",
      i18nDir: "src/locales",
      contractsDir: "base",
      outDir: "src/generated",
      locales: ["en-US", "zh-CN"],
      mode: "folder",
    });

    expect(result).toEqual({
      root: resolve("project"),
      i18nDir: resolve("project", "src/locales"),
      contractsDir: resolve("project", "src/locales", "base"),
      outDir: resolve("project", "src/generated"),
      locales: ["en-US", "zh-CN"],
      mode: "folder",
    });
  });
});
