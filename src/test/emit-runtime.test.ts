import { describe, expect, it } from "vitest";
import {
  createAlternation,
  createGlobPattern,
  createInitialResources,
  emitRuntime,
} from "../core/emit/runtime";

describe("emitRuntime", () => {
  it("输入 ['en-US', 'zh-CN'] 返回 './{en-US,zh-CN}/*.ts'", () => {
    const out = createGlobPattern(["en-US", "zh-CN"]);
    expect(out).toBe("./{en-US,zh-CN}/*.ts");
  });

  it("输入 ['en-US', 'zh-CN'] 返回 'en-US|zh-CN'", () => {
    const out = createAlternation(["en-US", "zh-CN"]);
    expect(out).toBe("en-US|zh-CN");
  });

  it("输入 ['en-US', 'zh-CN'] 返回 'en-US': {}, 'zh-CN': {}'", () => {
    const out = createInitialResources(["en-US", "zh-CN"]);
    expect(out).toBe("'en-US': {}, 'zh-CN': {}");
  });

  it("输入 ['en-US', 'zh-CN'] 返回 产物", () => {
    const out = emitRuntime(["en-US", "zh-CN"]);
    console.log(out);
    expect(
      out
    ).toContain(`const modules: Record<string, unknown> = import.meta.glob(
    './{en-US,zh-CN}/*.ts',
    { eager: true },
  );
const resources: Resource = { 'en-US': {}, 'zh-CN': {} };`);
  });
});
