import type {
  Dimension,
  Flag,
  Measures,
  Profile,
  Session,
  Tap,
  TrialOutcome,
  TrialResult,
  TrialSpec,
} from "../types/profile";
import { assessReliability, describe } from "../types/profile";

const DIMENSIONS: Dimension[] = ["baseline", "twoActions", "reversed", "threeActions", "negation"];

// span is read only from the plain sequencing ladder; reversed and negation trials are separate questions
const SPAN_LADDER: Dimension[] = ["baseline", "twoActions", "threeActions"];

// the child's answer: card taps made after the instruction finished playing
export function responseTaps(taps: Tap[]): string[] {
  return taps.filter((tap) => tap.t >= 0 && tap.cardId !== null).map((tap) => tap.cardId as string);
}

// the trial runner closes the response window as soon as this is true
export function isResponseComplete(taps: Tap[], expected: string[]): boolean {
  return responseTaps(taps).length >= expected.length;
}

export function classifyTrial(taps: Tap[], expected: string[]): TrialOutcome {
  const response = responseTaps(taps).slice(0, expected.length);
  if (response.length === 0) return "noResponse";
  if (response.length < expected.length) return "incomplete";
  if (response.every((id, i) => id === expected[i])) return "correct";
  const sameCards = [...response].sort().join() === [...expected].sort().join();
  return sameCards ? "wrongOrder" : "wrongElement";
}

// a card tapped while the instruction was still playing, then a different card in that same position afterwards
// this definition needs a clearer answer from the clinical team: a tap-only surface has no explicit undo
function selfCorrections(taps: Tap[]): number {
  const early = taps.filter((tap) => tap.t < 0 && tap.cardId !== null).map((tap) => tap.cardId);
  const response = responseTaps(taps);
  return early.filter((id, i) => i < response.length && response[i] !== id).length;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function proportionCorrect(outcomes: TrialOutcome[]): number | null {
  if (outcomes.length === 0) return null;
  return outcomes.filter((outcome) => outcome === "correct").length / outcomes.length;
}

// this turns the recorded taps into a profile
export function computeProfile(session: Session, trials: TrialSpec[]): Profile {
  const scored = session.results.flatMap((result: TrialResult) => {
    const spec = trials.find((trial) => trial.id === result.trialId);
    return spec ? [{ spec, result, outcome: classifyTrial(result.taps, spec.expected) }] : [];
  });

  const accuracy = Object.fromEntries(
    DIMENSIONS.map((dimension) => [
      dimension,
      proportionCorrect(scored.filter((s) => s.spec.dimension === dimension).map((s) => s.outcome)),
    ]),
  ) as Record<Dimension, number | null>;

  const ladderCounts = [
    ...new Set(scored.filter((s) => SPAN_LADDER.includes(s.spec.dimension)).map((s) => s.spec.actionCount)),
  ].sort((a, b) => a - b);
  const ladderAccuracy = ladderCounts.map((count) => ({
    count,
    accuracy: proportionCorrect(
      scored
        .filter((s) => SPAN_LADDER.includes(s.spec.dimension) && s.spec.actionCount === count)
        .map((s) => s.outcome),
    )!,
  }));

  const firstTaps = scored.flatMap(({ result }) => {
    const first = result.taps.find((tap) => tap.t >= 0);
    return first ? [first.t] : [];
  });

  const forward = accuracy.twoActions;
  const reversed = accuracy.reversed;

  const measures: Measures = {
    actionSpan: Math.max(0, ...ladderAccuracy.filter((l) => l.accuracy > 0.5).map((l) => l.count)),
    breakPoint: ladderAccuracy.find((l) => l.accuracy < 0.5)?.count ?? null,
    accuracy,
    orderCost: forward === null || reversed === null ? null : forward - reversed,
    medianFirstTapMs: median(firstTaps),
    prematureStarts: scored.filter(({ result }) => result.taps.some((tap) => tap.t < 0)).length,
    selfCorrections: scored.reduce((sum, { result }) => sum + selfCorrections(result.taps), 0),
    replaysRequested: scored.filter(({ result }) => result.replayed).length,
    trialsAttempted: scored.filter(({ result }) => result.taps.some((tap) => tap.cardId !== null)).length,
    trialsCompleted: scored.filter(({ result }) => !result.abandoned).length,
  };

  const baseline = scored.filter((s) => s.spec.dimension === "baseline");
  const flags: Flag[] = [];
  if (!session.vocabCheckPassed) flags.push("vocab_check_failed");
  if (baseline.length > 0 && baseline.every((s) => s.outcome !== "correct")) flags.push("baseline_failed");
  if (measures.trialsAttempted < 6) flags.push("session_abandoned");
  if (flags.length > 0) flags.push("priority_referral");

  return {
    schemaVersion: 1,
    sessionId: session.sessionId,
    childCode: session.childCode,
    grade: 1,
    measures,
    descriptors: describe(measures),
    flags,
    reliability: assessReliability(measures),
  };
}
