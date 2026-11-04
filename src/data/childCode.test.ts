import { describe, expect, it } from "vitest";
import { isValidChildCode, normalizeChildCode } from "./childCode";

describe("child session codes", () => {
  it("accepts school-style alphanumeric codes with separators", () => {
    expect(isValidChildCode("ESC-3B-014")).toBe(true);
    expect(isValidChildCode("2026_3A_001")).toBe(true);
  });

  it("rejects names, codes without a digit, and invalid lengths", () => {
    expect(isValidChildCode("ANA")).toBe(false);
    expect(isValidChildCode("ABC-DEF")).toBe(false);
    expect(isValidChildCode("A1")).toBe(false);
    expect(isValidChildCode(`A${"1".repeat(32)}`)).toBe(false);
  });

  it("normalizes pasted values and caps them at the supported length", () => {
    expect(normalizeChildCode("esc 3b/014")).toBe("ESC3B014");
    expect(normalizeChildCode(`A${"1".repeat(40)}`)).toHaveLength(32);
  });
});
