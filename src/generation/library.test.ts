import { describe, expect, it } from "vitest";
import { STRATEGIES } from "./matchStrategies";
import { buildPrompt } from "./buildPrompt";
import { applyRails } from "./applyRails";
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

describe("strategy library and the rails", () => {
  it("never loses a sentence of a strategy to the blocked-term or score rules", () => {
    for (const s of STRATEGIES) {
      const text = [s.title + ".", ...s.script, s.watchFor].join("\n");
      const version = { observed: text, toTry: text, watchFor: text };
      const railed = applyRails({ classroom: version, home: version }, []);
      expect(railed.sections.classroom.toTry, s.id).toBe(text);
    }
  });
});
