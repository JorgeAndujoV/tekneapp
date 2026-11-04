import { describe, expect, it } from "vitest";
import { matchStrategies, STRATEGIES } from "./matchStrategies";
import {
  FIXTURE_INSUFFICIENT,
  FIXTURE_SAME_SPAN_NO_MONITORING,
  FIXTURE_TYPICAL_WITH_SHORT_SPAN,
  type ErrorCode,
  type Profile,
} from "../types/profile";

const noCounts = FIXTURE_INSUFFICIENT.measures.codeCounts;

function profileWith(
  counts: Partial<Record<ErrorCode, number>>,
  dominantCode: ErrorCode | null,
  descriptors: Partial<Profile["descriptors"]> = {},
): Profile {
  return {
    ...FIXTURE_TYPICAL_WITH_SHORT_SPAN,
    reliability: "ok",
    measures: { ...FIXTURE_TYPICAL_WITH_SHORT_SPAN.measures, codeCounts: { ...noCounts, ...counts }, dominantCode },
    descriptors: { ...FIXTURE_TYPICAL_WITH_SHORT_SPAN.descriptors, asksForRepeats: "never", startsEarly: false, ...descriptors },
  };
}

const serves = (code: string) => (s: { codes: string[] }) => s.codes.includes(code);

describe("matchStrategies", () => {
  it("never returns more than 3 strategies", () => {
    expect(matchStrategies(FIXTURE_SAME_SPAN_NO_MONITORING).length).toBeLessThanOrEqual(3);
    expect(matchStrategies(FIXTURE_TYPICAL_WITH_SHORT_SPAN).length).toBeLessThanOrEqual(3);
  });

  it("returns nothing for a session that was too short", () => {
    expect(matchStrategies(FIXTURE_INSUFFICIENT)).toEqual([]);
  });

  it("puts a strategy for the dominant code first", () => {
    expect(matchStrategies(FIXTURE_TYPICAL_WITH_SHORT_SPAN)[0].codes).toContain("E1");
    expect(matchStrategies(FIXTURE_SAME_SPAN_NO_MONITORING)[0].codes).toContain("E3");
  });

  it("also covers other codes that recur, without repeating a strategy", () => {
    const result = matchStrategies(FIXTURE_SAME_SPAN_NO_MONITORING);
    expect(result.some(serves("E4"))).toBe(true);
    expect(new Set(result.map((s) => s.id)).size).toBe(result.length);
  });

  it("ignores a code that appeared in only one trial", () => {
    const result = matchStrategies(profileWith({ E1: 2, E3: 1 }, "E1"));
    expect(result.some((s) => s.codes.includes("E3") && !s.codes.includes("E1"))).toBe(false);
  });

  it("falls back to the all-purpose strategy when no pattern recurs", () => {
    const result = matchStrategies(profileWith({ E1: 1 }, null));
    expect(result).toHaveLength(1);
    expect(result[0].codes).toHaveLength(8);
  });

  it("gives a code with only an all-purpose strategy that strategy, and still covers the next code", () => {
    const result = matchStrategies(profileWith({ E5: 3, E1: 2 }, "E5"));
    expect(result[0].codes).toHaveLength(8);
    expect(result.some((s) => s.codes.includes("E1") && s.codes.length < 8)).toBe(true);
  });

  it("adds the asking strategies only when the child asked for replays", () => {
    const never = matchStrategies(profileWith({ E1: 2 }, "E1", { asksForRepeats: "never" }));
    const asked = matchStrategies(profileWith({ E1: 2 }, "E1", { asksForRepeats: "sometimes" }));
    expect(never.some(serves("F1"))).toBe(false);
    expect(asked.some(serves("F1"))).toBe(true);
  });

  it("gives the same child the same picks and different children different ones", () => {
    const picks = (sessionId: string) =>
      matchStrategies({ ...profileWith({ E1: 3 }, "E1"), sessionId })
        .map((s) => s.id)
        .join();
    expect(picks("child-a")).toBe(picks("child-a"));
    expect(new Set(["a", "b", "c", "d", "e", "f"].map(picks)).size).toBeGreaterThan(1);
  });

  it("only returns strategies that exist in the library", () => {
    const ids = STRATEGIES.map((s) => s.id);
    for (const s of matchStrategies(FIXTURE_SAME_SPAN_NO_MONITORING)) expect(ids).toContain(s.id);
  });
});
