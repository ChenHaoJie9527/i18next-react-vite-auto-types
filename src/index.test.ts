import { describe, expect, it } from "vitest";
import { greet, sum } from "./index";

describe("greet", () => {
  it("should return greeting with provided name", () => {
    expect(greet("World")).toBe("Hello, WORLD!");
  });
});

describe("sum", () => {
  it("should add two positive numbers", () => {
    expect(sum(1, 2)).toBe(3);
  });

  it("should handle negative numbers", () => {
    expect(sum(-1, -2)).toBe(-3);
  });
});
