import { describe, expect, it } from "vitest";
import { resolveConfig } from "../core/resolve-config";
import { I18nextKitError } from "../core/types";

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

  //   it("mode 为空时抛 INVALID_CONFIG", () => {
  //     expect(() => resolveConfig({ locales: ["en-US"], mode: "folder" })).toThrow(
  //       I18nextKitError
  //     );
  //   });
});
