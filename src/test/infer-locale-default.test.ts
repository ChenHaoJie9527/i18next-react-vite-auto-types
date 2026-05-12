import { describe, expect, it } from "vitest";
import {
  inferLocaleDefaultValue,
  mergeLocaleDefaultValue,
  parseLocaleDefaultValue,
} from "../lib/infer-locale-default";

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

  it("parses existing generated locale default values", () => {
    expect(
      parseLocaleDefaultValue(`export default {
  "title": "Hello",
  copy: "Copy text",
} satisfies CommonMessage;
`)
    ).toEqual({
      copy: "Copy text",
      title: "Hello",
    });
  });

  it("keeps existing values while following inferred keys", () => {
    expect(
      mergeLocaleDefaultValue(
        { copy: "", title: "" },
        `export default {
  "title": "Hello",
  "removed": "Removed",
} satisfies CommonMessage;
`
      )
    ).toEqual({
      copy: "",
      title: "Hello",
    });
  });
});
