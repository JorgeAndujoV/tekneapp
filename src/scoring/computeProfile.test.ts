import { describe, expect, it } from "vitest";
import { computeProfile, isResponseComplete } from "./computeProfile";
import { TRIALS } from "../data/trials";
import { CARDS } from "../data/cards";
import type { Session, Tap, TrialResult } from "../types/profile";

function expectedOf(trialId: string): string[] {
  return TRIALS.find((trial) => trial.id === trialId)!.expected;
}

function answer(trialId: string, cards: string[], early: Tap[] = []): TrialResult {
  const taps = [...early, ...cards.map((cardId, i) => ({ cardId, t: 900 + i * 700 }))];
  return {
    trialId,
    taps,
    replayed: false,
    abandoned: cards.length < expectedOf(trialId).length,
  };
}

function correct(trialId: string): TrialResult {
  return answer(trialId, expectedOf(trialId));
}

function wrong(trialId: string): TrialResult {
  const expected = expectedOf(trialId);
  const intruder = CARDS.find((card) => !expected.includes(card.id))!.id;
  return answer(trialId, [intruder, ...expected.slice(1)]);
}

function session(results: TrialResult[]): Session {
  return {
    sessionId: "test",
    childCode: "T-01",
    grade: 1,
    startedAt: "2026-11-02T10:00:00.000Z",
    vocabCheckPassed: true,
    results,
  };
}

const ids = (dimensions: string[]) =>
  TRIALS.filter((trial) => dimensions.includes(trial.dimension)).map((trial) => trial.id);

describe("computeProfile", () => {
  it("gives a perfect session a span of three and no flags", () => {
    const profile = computeProfile(session(TRIALS.map((trial) => correct(trial.id))), TRIALS);
    expect(profile.measures.actionSpan).toBe(3);
    expect(profile.flags).toEqual([]);
  });

  it("finds a span of two and a break point of three when three-step trials fail", () => {
    const results = TRIALS.map((trial) =>
      trial.dimension === "threeActions" ? wrong(trial.id) : correct(trial.id),
    );
    const profile = computeProfile(session(results), TRIALS);
    expect(profile.measures.actionSpan).toBe(2);
    expect(profile.measures.breakPoint).toBe(3);
  });

  it("gives a positive order cost when forward order holds and reversed order fails", () => {
    const reversed = ids(["reversed"]);
    const results = TRIALS.map((trial) =>
      reversed.includes(trial.id) ? wrong(trial.id) : correct(trial.id),
    );
    const profile = computeProfile(session(results), TRIALS);
    expect(profile.measures.accuracy.twoActions).toBe(1);
    expect(profile.measures.orderCost).toBeGreaterThan(0);
  });

  it("marks a four-trial session as insufficient", () => {
    const results = TRIALS.slice(0, 4).map((trial) => correct(trial.id));
    const profile = computeProfile(session(results), TRIALS);
    expect(profile.reliability).toBe("insufficient");
  });

  it("flags a failed baseline and asks for priority referral", () => {
    const baseline = ids(["baseline"]);
    const results = TRIALS.map((trial) =>
      baseline.includes(trial.id) ? wrong(trial.id) : correct(trial.id),
    );
    const profile = computeProfile(session(results), TRIALS);
    expect(profile.flags).toContain("baseline_failed");
    expect(profile.flags).toContain("priority_referral");
  });

  it("names the most frequent answer code as dominant and breaks ties by severity", () => {
    const stopped = ["t03", "t04"];
    const wrongShape: Record<string, string[]> = { t05: ["y-c", "y-s"], t08: ["r-c", "b-s", "y-s"] };
    const results = TRIALS.map((trial) => {
      if (stopped.includes(trial.id)) return answer(trial.id, [expectedOf(trial.id)[0]]);
      if (wrongShape[trial.id]) return answer(trial.id, wrongShape[trial.id]);
      return correct(trial.id);
    });
    const { measures } = computeProfile(session(results), TRIALS);
    expect(measures.codeCounts.E1).toBe(2);
    expect(measures.codeCounts.E4).toBe(2);
    expect(measures.dominantCode).toBe("E1");
  });

  it("names no dominant code when a pattern appears only once", () => {
    const results = TRIALS.map((trial) =>
      trial.id === "t05" ? answer("t05", ["y-c", "y-s"]) : correct(trial.id),
    );
    expect(computeProfile(session(results), TRIALS).measures.dominantCode).toBeNull();
  });

  it("counts taps during the audio as a premature start without closing the window", () => {
    const early: Tap[] = [{ cardId: "r-c", t: -400 }];
    expect(isResponseComplete(early, ["r-c"])).toBe(false);
    expect(isResponseComplete([...early, { cardId: "r-c", t: 300 }], ["r-c"])).toBe(true);

    const results = TRIALS.map((trial) =>
      trial.id === "t01" ? answer("t01", ["r-c"], early) : correct(trial.id),
    );
    const profile = computeProfile(session(results), TRIALS);
    expect(profile.measures.prematureStarts).toBe(1);
  });
});
