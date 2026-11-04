import { describe, expect, it } from "vitest";
import { STRATEGIES } from "./matchStrategies";
import { buildPrompt } from "./buildPrompt";
import { FIXTURE_TYPICAL_WITH_SHORT_SPAN, promptView } from "../types/profile";

describe("strategy library", () => {
  it("gives every strategy codes, an evidence level, a note and a source", () => {
    for (const s of STRATEGIES) {
      expect(s.codes.length, s.id).toBeGreaterThan(0);
      expect(s.evidence, s.id).not.toBe("none");
      expect(s.evidenceNote, s.id).not.toBe("");
      expect(s.source, s.id).not.toBe("");
    }
  });

  it("has no repeated ids", () => {
    expect(new Set(STRATEGIES.map((s) => s.id)).size).toBe(STRATEGIES.length);
  });

  it("fits every strategy into a prompt without a digit", () => {
    for (const s of STRATEGIES) {
      expect(() => buildPrompt(promptView(FIXTURE_TYPICAL_WITH_SHORT_SPAN), [s]), s.id).not.toThrow();
    }
  });
});
