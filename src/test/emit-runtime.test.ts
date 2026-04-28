import { describe, expect, it } from "vitest";
import { createAlternation, createGlobPattern } from "../core/emit/runtime";

describe("emitRuntime", () => {
  it("输入 ['en-US', 'zh-CN'] 返回 './{en-US,zh-CN}/*.ts'", () => {
    const out = createGlobPattern(["en-US", "zh-CN"]);
    expect(out).toBe("./{en-US,zh-CN}/*.ts");
  });

  it("输入 ['en-US', 'zh-CN'] 返回 'en-US|zh-CN'", () => {
    const out = createAlternation(["en-US", "zh-CN"]);
    expect(out).toBe("en-US|zh-CN");
  });
});
