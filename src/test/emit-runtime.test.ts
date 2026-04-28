import { describe, expect, it } from "vitest";
import { emitRuntime } from "../core/emit/runtime";

describe("emitRuntime", () => {
  it("输入 ['en-US', 'zh-CN'] 返回 './{en-US,zh-CN}/*.ts'", () => {
    const out = emitRuntime(["en-US", "zh-CN"]);
    expect(out).toBe("./{en-US,zh-CN}/*.ts");
  });
});
