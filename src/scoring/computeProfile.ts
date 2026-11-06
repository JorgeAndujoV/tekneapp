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
import {
  assessReliability,
  describe,
  DOMINANT_MIN_TRIALS,
  ERROR_CODES,
  MOST_FAILED_BELOW,
  NO_RESPONSE_FROM,
  REPLAYS_OFTEN_ABOVE,
  replayShare,
  SEVERITY,
} from "../types/profile";

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
  return classifyResponse(responseTaps(taps), expected);
}

export function classifySelection(selection: Tap[], expected: string[]): TrialOutcome {
  const response = selection.flatMap((tap) => (tap.cardId === null ? [] : [tap.cardId]));
  return classifyResponse(response, expected);
}

function classifyResponse(response: string[], expected: string[]): TrialOutcome {
  const answer = response.slice(0, expected.length);
  if (answer.length === 0) return "noResponse";
  if (answer.length < expected.length) return "incomplete";
  if (answer.every((id, i) => id === expected[i])) return "correct";
  const sameCards = [...answer].sort().join() === [...expected].sort().join();
  return sameCards ? "wrongOrder" : "wrongElement";
}

function isSubsequence(response: string[], expected: string[]): boolean {
  let matched = 0;
  for (const id of expected) if (id === response[matched]) matched++;
  return matched === response.length;
}

function containsWrongCard(response: string[], expected: string[]): boolean {
  const remaining = [...expected];
  for (const id of response) {
    const index = remaining.indexOf(id);
    if (index < 0) return true;
    remaining.splice(index, 1);
  }
  return false;
}

function unmatched(response: string[], expected: string[]): { foreign: string[]; missing: string[] } {
  const missing = [...expected];
  const foreign: string[] = [];
  for (const id of response) {
    const index = missing.indexOf(id);
    if (index < 0) foreign.push(id);
    else missing.splice(index, 1);
  }
  return { foreign, missing };
}

function wrongAttribute(foreign: string[], missing: string[]): WrongAttribute {
  const animal = foreign.some((id, index) => id.split("-")[1] !== missing[index]?.split("-")[1]);
  const colour = foreign.some((id, index) => id.split("-")[0] !== missing[index]?.split("-")[0]);
  return animal && colour ? "animalAndColour" : animal ? "animal" : "colour";
}

function confusedAttribute(trialCodes: TrialCodes[]): WrongAttribute | null {
  const counts: Partial<Record<WrongAttribute, number>> = {};
  for (const trial of trialCodes) {
    if (trial.wrongAttribute) counts[trial.wrongAttribute] = (counts[trial.wrongAttribute] ?? 0) + 1;
  }
  const [best] = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return best && best[1] >= DOMINANT_MIN_TRIALS ? (best[0] as WrongAttribute) : null;
}

const sameSequence = (a: string[], b: string[]) => a.length === b.length && a.every((id, i) => id === b[i]);

export function codeTrial(result: TrialResult, spec: TrialSpec, previous?: TrialSpec): TrialCodes {
  const { expected } = spec;
  const chosen = result.finalSelection
    ? result.finalSelection.flatMap((tap) => (tap.cardId === null ? [] : [tap.cardId]))
    : responseTaps(result.taps);
  const response = chosen.slice(0, expected.length);
  const coded: TrialCodes = { trialId: result.trialId, codes: [] };
  const { codes } = coded;
  const short = response.length < expected.length;

  if (response.length === 0) {
    codes.push("E8");
  } else if (!sameSequence(response, expected)) {
    if (short && response.every((id, i) => id === expected[i])) {
      codes.push("E1");
    } else if (short && isSubsequence(response, expected)) {
      codes.push("E2");
    } else if (!containsWrongCard(response, expected)) {
      codes.push("E3");
      if (spec.dimension === "reversed") coded.reversedItem = true;
    } else {
      codes.push("E4");
      const { foreign, missing } = unmatched(response, expected);
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

export function computeProfile(session: Session, trials: TrialSpec[]): Profile {
  const scored = session.results.flatMap((result: TrialResult) => {
    const spec = trials.find((trial) => trial.id === result.trialId);
    if (!spec) return [];
    const outcome = result.finalSelection
      ? classifySelection(result.finalSelection, spec.expected)
      : classifyTrial(result.taps, spec.expected);
    return [{ spec, result, outcome }];
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
    const first = (result.finalSelection ?? result.taps).find((tap) => tap.t >= 0);
    return first ? [first.t] : [];
  });

  const forward = accuracy.twoActions;
  const reversed = accuracy.reversed;
  const trialCodes = scored.map(({ spec, result }, i) => codeTrial(result, spec, scored[i - 1]?.spec));
  const codeCounts = Object.fromEntries(
    ERROR_CODES.map((code) => [code, trialCodes.filter((t) => t.codes.includes(code)).length]),
  ) as Record<ErrorCode, number>;

  const measures: Measures = {
    actionSpan: Math.max(0, ...ladderAccuracy.filter((l) => l.accuracy > 0.5).map((l) => l.count)),
    breakPoint: ladderAccuracy.find((l) => l.accuracy < 0.5)?.count ?? null,
    accuracy,
    orderCost: forward === null || reversed === null ? null : forward - reversed,
    medianFirstTapMs: median(firstTaps),
    prematureStarts: codeCounts.E7,
    selfCorrections: scored.reduce((sum, { result }) => sum + (result.selfCorrections ?? 0), 0),
    replaysRequested: scored.filter(({ result }) => result.replayed).length,
    replaysThenCorrect: scored.filter(({ result, outcome }) => result.replayed && outcome === "correct").length,
    trialsAttempted: scored.filter(({ result }) => result.taps.some((tap) => tap.cardId !== null)).length,
    trialsCompleted: scored.filter(({ result }) => !result.abandoned).length,
    codeCounts,
    dominantCode: dominantCode(codeCounts),
    confusedAttribute: confusedAttribute(trialCodes),
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
  if (enough && replayShare(measures) > REPLAYS_OFTEN_ABOVE) flags.push("replays_often");
  if (enough && share(codeCounts.E8) >= NO_RESPONSE_FROM) flags.push("many_no_response");
  if (measures.trialsAttempted < 6) flags.push("session_abandoned");
  if (session.homeLanguageNotSpanish) flags.push("home_language");
  if (flags.some((flag) => flag !== "home_language")) flags.push("priority_referral");

  return {
    schemaVersion: 3,
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
