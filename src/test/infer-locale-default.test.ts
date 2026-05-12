import { describe, expect, it } from "vitest";
import { inferLocaleDefaultValue } from "../lib/infer-locale-default";

describe("inferLocaleDefaultValue", () => {
  it("infers required string keys from exported type literals", () => {
    expect(
      inferLocaleDefaultValue(
        `export type CommonMessage = {
  title: string;
  "table.title": string;
};`,
        "CommonMessage"
      )
    ).toEqual({
      "table.title": "",
      title: "",
    });
  });

  it("returns an empty object for unsupported shapes", () => {
    expect(
      inferLocaleDefaultValue(
        "export interface CommonMessage { title: string }",
        "CommonMessage"
      )
    ).toEqual({});
  });
});
