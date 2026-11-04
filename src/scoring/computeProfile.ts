import type {
  Dimension,
  ErrorCode,
  Flag,
  Measures,
  Profile,
  Session,
  Tap,
  TrialCodes,
  TrialOutcome,
  TrialResult,
  TrialSpec,
  WrongAttribute,
} from "../types/profile";
import { assessReliability, describe, DOMINANT_MIN_TRIALS, ERROR_CODES, SEVERITY } from "../types/profile";

const MOST_FAILED_BELOW = 0.5;
const REPLAYS_OFTEN_ABOVE = 0.5;
const NO_RESPONSE_FROM = 1 / 3;

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

function isSubsequence(response: string[], expected: string[]): boolean {
  let matched = 0;
  for (const id of expected) if (id === response[matched]) matched++;
  return matched === response.length;
}

function unmatched(response: string[], expected: string[]): { foreign: string[]; missing: string[] } {
  const missing = [...expected];
  const foreign: string[] = [];
  for (const id of response) {
    const at = missing.indexOf(id);
    if (at < 0) foreign.push(id);
    else missing.splice(at, 1);
  }
  return { foreign, missing };
}

function wrongAttribute(foreign: string[], missing: string[]): WrongAttribute {
  const colour = foreign.some((id, i) => id[0] !== missing[i]?.[0]);
  const shape = foreign.some((id, i) => id[2] !== missing[i]?.[2]);
  return colour && shape ? "colourAndShape" : colour ? "colour" : "shape";
}

const sameSequence = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i]);

export function codeTrial(result: TrialResult, spec: TrialSpec, previous?: TrialSpec): TrialCodes {
  const { expected } = spec;
  const response = responseTaps(result.taps).slice(0, expected.length);
  const coded: TrialCodes = { trialId: result.trialId, codes: [] };
  const { codes } = coded;
  const short = response.length < expected.length;

  if (response.length === 0) {
    codes.push("E8");
  } else if (!sameSequence(response, expected)) {
    const { foreign, missing } = unmatched(response, expected);
    if (short && response.every((id, i) => id === expected[i])) {
      codes.push("E1");
    } else if (short && isSubsequence(response, expected)) {
      codes.push("E2");
    } else if (foreign.length === 0) {
      codes.push("E3");
      if (spec.dimension === "reversed") coded.reversedItem = true;
    } else {
      codes.push("E4");
      coded.wrongAttribute = wrongAttribute(foreign, missing);
    }
    if (previous && sameSequence(response, previous.expected) && (codes[0] === "E3" || codes[0] === "E4")) {
      codes.push("E5");
    }
  }

  if (spec.dimension === "negation" && codes.length > 0) codes.push("E6");
  if (result.taps.some((tap) => tap.t < 0)) codes.push("E7");
  return coded;
}

function dominantCode(counts: Record<ErrorCode, number>): ErrorCode | null {
  return SEVERITY.reduce<ErrorCode | null>(
    (best, code) => (counts[code] >= DOMINANT_MIN_TRIALS && (best === null || counts[code] > counts[best]) ? code : best),
    null,
  );
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

  const trialCodes = scored.map(({ spec, result }, i) => codeTrial(result, spec, scored[i - 1]?.spec));
  const codeCounts = Object.fromEntries(
    ERROR_CODES.map((code) => [code, trialCodes.filter((t) => t.codes.includes(code)).length]),
  ) as Record<ErrorCode, number>;

  const forward = accuracy.twoActions;
  const reversed = accuracy.reversed;

  const measures: Measures = {
    actionSpan: Math.max(0, ...ladderAccuracy.filter((l) => l.accuracy > 0.5).map((l) => l.count)),
    breakPoint: ladderAccuracy.find((l) => l.accuracy < 0.5)?.count ?? null,
    accuracy,
    orderCost: forward === null || reversed === null ? null : forward - reversed,
    medianFirstTapMs: median(firstTaps),
    prematureStarts: codeCounts.E7,
    selfCorrections: scored.reduce((sum, { result }) => sum + selfCorrections(result.taps), 0),
    replaysRequested: scored.filter(({ result }) => result.replayed).length,
    trialsAttempted: scored.filter(({ result }) => result.taps.some((tap) => tap.cardId !== null)).length,
    trialsCompleted: scored.filter(({ result }) => !result.abandoned).length,
    codeCounts,
    dominantCode: dominantCode(codeCounts),
  };

  const baseline = scored.filter((s) => s.spec.dimension === "baseline");
  const share = (count: number) => (scored.length === 0 ? 0 : count / scored.length);
  const enough = scored.length >= 6;
  const flags: Flag[] = [];
  if (session.redFlag) flags.push("red_flag");
  if (session.stoppedForDistress) flags.push("distress_stop");
  if (!session.vocabCheckPassed) flags.push("vocab_check_failed");
  if (baseline.length > 0 && baseline.every((s) => s.outcome !== "correct")) flags.push("baseline_failed");
  const correctShare = share(scored.filter((s) => s.outcome === "correct").length);
  if (enough && correctShare < MOST_FAILED_BELOW && baseline.some((s) => s.outcome !== "correct")) flags.push("most_failed");
  if (enough && share(measures.replaysRequested) > REPLAYS_OFTEN_ABOVE) flags.push("replays_often");
  if (enough && share(codeCounts.E8) >= NO_RESPONSE_FROM) flags.push("many_no_response");
  if (measures.trialsAttempted < 6) flags.push("session_abandoned");
  if (session.homeLanguageNotSpanish) flags.push("home_language");
  if (flags.some((flag) => flag !== "home_language")) flags.push("priority_referral");

  return {
    schemaVersion: 2,
    sessionId: session.sessionId,
    childCode: session.childCode,
    grade: 1,
    measures,
    trialCodes,
    descriptors: describe(measures),
    flags,
    reliability: assessReliability(measures),
  };
}
