import { describe, expect, it } from "vitest";
import { I18nextKitError } from "../core";

describe("I18nextKitError", () => {
  it("创建错误时，code 和 message 正确", () => {
    const error = new I18nextKitError(
      "CONTRACTS_DIR_NOT_FOUND",
      "The contracts directory does not exist"
    );
    expect(error.code).toBe("CONTRACTS_DIR_NOT_FOUND");
    expect(error.message).toBe(
      "[CONTRACTS_DIR_NOT_FOUND] The contracts directory does not exist"
    );
    expect(error.detail).toEqual({});
  });

  it("创建错误时，detail 正确", () => {
    const error = new I18nextKitError(
      "CONTRACTS_DIR_NOT_FOUND",
      "The contracts directory does not exist",
      { dir: "./contracts" }
    );
    expect(error.code).toBe("CONTRACTS_DIR_NOT_FOUND");
    expect(error.message).toBe(
      "[CONTRACTS_DIR_NOT_FOUND] The contracts directory does not exist"
    );
    expect(error.detail).toEqual({ dir: "./contracts" });
  });
});
