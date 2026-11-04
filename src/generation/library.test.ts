import { describe, expect, it } from "vitest";
import { STRATEGIES } from "./matchStrategies";
import { buildPrompt } from "./buildPrompt";
import { applyRails } from "./applyRails";
import { withStrategies } from "./strategyText";
import { FIXTURE_TYPICAL_WITH_SHORT_SPAN, promptView } from "../types/profile";

describe("strategy library", () => {
  it("gives every strategy its codes, steps, example, guidance, evidence and source", () => {
    for (const s of STRATEGIES) {
      expect(s.codes.length, s.id).toBeGreaterThan(0);
      expect(s.script.length, s.id).toBeGreaterThan(2);
      expect(s.whenToUse, s.id).not.toBe("");
      expect(s.example.classroom, s.id).not.toBe("");
      expect(s.example.home, s.id).not.toBe("");
      expect(s.ifItDoesNotWork, s.id).not.toBe("");
      expect(s.commonMistakes, s.id).not.toBe("");
      expect(s.evidence, s.id).not.toBe("none");
      expect(s.evidenceNote, s.id).not.toBe("");
      expect(s.source, s.id).not.toBe("");
    }
  });

  it("has no repeated ids", () => {
    expect(new Set(STRATEGIES.map((s) => s.id)).size).toBe(STRATEGIES.length);
  });
});

describe("strategy text in the manual", () => {
  it("shows every step of every strategy, numbered, for both settings", () => {
    for (const s of STRATEGIES) {
      const sections = withStrategies({ classroom: "a", home: "b" }, [s]);
      for (const setting of ["classroom", "home"] as const) {
        const text = sections[setting].toTry;
        s.script.forEach((step, i) => expect(text, s.id).toContain(`Paso ${i + 1}: ${step}`));
        expect(text, s.id).toContain(s.example[setting]);
        expect(text, s.id).toContain(s.ifItDoesNotWork);
      }
    }
  });

  it("never loses a sentence of a strategy to the blocked-term or score rules", () => {
    for (const s of STRATEGIES) {
      const sections = withStrategies({ classroom: "a", home: "b" }, [s]);
      const railed = applyRails(sections, []);
      expect(railed.sections.classroom.toTry, s.id).toBe(sections.classroom.toTry);
      expect(railed.sections.home.toTry, s.id).toBe(sections.home.toTry);
      expect(railed.sections.classroom.watchFor, s.id).toBe(sections.classroom.watchFor);
    }
  });

  it("keeps the strategy text out of the prompt sent to the model", () => {
    const text = buildPrompt(promptView(FIXTURE_TYPICAL_WITH_SHORT_SPAN)).map((m) => m.content).join("\n");
    for (const s of STRATEGIES) expect(text, s.id).not.toContain(s.title);
  });
});
