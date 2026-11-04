/**
 * PROFILE CONTRACT — freeze this at the end of Day 1.
 *
 * This file is the only thing passing between the two halves of the system.
 *
 *   taps  ->  computeProfile()  ->  Profile  ->  matchStrategies() / buildPrompt()
 *             [measurement]                      [generation]
 *
 * Both halves import from here. Add fields on Day 1 if you must; after that,
 * nothing changes — a new field ripples into strategies.json, the prompt and
 * the manual template, and that is how demos break on Day 3.
 *
 * Two rules this file enforces by construction:
 *   1. The generation side reads `descriptors` only. Never `measures`.
 *      Numbers cannot leak into the manual if the model never receives them.
 *   2. Nothing here says WHY a child failed. We record what happened.
 *      The error taxonomy is a later file, applied to stored taps.
 */

// ---------------------------------------------------------------------------
// 1. Trial structure  (mirrors trials.json)
// ---------------------------------------------------------------------------

/** The escalation dimensions. No spatial prepositions — sequencing instead. */
export type Dimension =
  | "baseline" // 1 action, 1 element            — trials 1–2
  | "twoActions" // 2 actions, mention = execution — trials 3–5
  | "reversed" // "before/after", order flipped  — trials 6–7
  | "threeActions" // 3 actions                      — trials 8–10
  | "negation"; // negation or conditional        — trials 11–12

export interface TrialSpec {
  id: string;
  dimension: Dimension;
  actionCount: number;
  audioFile: string;
  audioMs: number;
  /** Ordered card ids making up a fully correct response. */
  expected: string[];
}

// ---------------------------------------------------------------------------
// 2. Raw capture  (what the device stores — never discarded)
// ---------------------------------------------------------------------------

export interface Tap {
  /** null = tap landed outside any card. */
  cardId: string | null;
  /** ms from END of audio. Negative means the child started early. */
  t: number;
}

export interface TrialResult {
  trialId: string;
  /** Raw pointer events, including selections later removed and taps outside cards. */
  taps: Tap[];
  /** Final ordered card selection when using the selectable-card interface. */
  finalSelection?: Tap[];
  /** Number of times an already-selected card was explicitly deselected. */
  selfCorrections?: number;
  replayed: boolean;
  /** Response window closed without a complete sequence. */
  abandoned: boolean;
}

export interface Session {
  sessionId: string;
  childCode: string; // never a name
  grade: 1;
  startedAt: string; // ISO
  vocabCheckPassed: boolean;
  results: TrialResult[];
}

/**
 * Per-trial outcome. Describes the RESPONSE, not a mechanism.
 * "wrongOrder" is an observation; "manipulation failure" would be a claim.
 */
export type TrialOutcome =
  | "correct"
  | "incomplete" // stopped before the sequence ended
  | "wrongOrder" // right cards, wrong sequence
  | "wrongElement" // right count, at least one wrong card
  | "noResponse";

// ---------------------------------------------------------------------------
// 3. Measures  — numbers. For matching and for audit. NOT for the prompt.
// ---------------------------------------------------------------------------

export interface Measures {
  /** Largest action count completed correctly on a majority of its trials. 0–3. */
  actionSpan: number;
  /** First action count where accuracy falls below half. null = never falls. */
  breakPoint: number | null;
  /** Proportion correct per dimension. null = no usable trials at that level. */
  accuracy: Record<Dimension, number | null>;
  /** forward accuracy − reversed accuracy. null if either side is missing. */
  orderCost: number | null;

  medianFirstTapMs: number | null;
  prematureStarts: number; // taps before audio ended
  selfCorrections: number; // explicit deselections of previously selected cards
  replaysRequested: number;

  trialsAttempted: number;
  trialsCompleted: number;
}

// ---------------------------------------------------------------------------
// 4. Descriptors — THE ONLY THING THE PROMPT SEES.
//     Coarse on purpose: 12 trials cannot support anything finer.
// ---------------------------------------------------------------------------

export type Holds = "holds" | "struggles" | "unknown";

export interface Descriptors {
  span: "one" | "two" | "threeOrMore" | "unknown";
  orderHandling: Holds;
  negationHandling: Holds;
  startsEarly: boolean;
  asksForRepeats: "never" | "sometimes" | "often";
  pace: "quick" | "measured" | "slow" | "unknown";
}

// ---------------------------------------------------------------------------
// 5. Flags and reliability
// ---------------------------------------------------------------------------

/** Deterministic. Set by rule, never by the model. */
export type Flag =
  | "vocab_check_failed" // scored vocabulary, not memory — say so in the manual
  | "baseline_failed" // missed 1-action trials: hearing, attention or comprehension
  | "session_abandoned"
  | "priority_referral"; // any of the above: this result cannot be read at face value

export type Reliability =
  | "ok" // >= 10 trials attempted
  | "partial" // 6–9: descriptors usable, treat lightly
  | "insufficient"; // < 6: generate no strategies at all

// ---------------------------------------------------------------------------
// 6. The contract
// ---------------------------------------------------------------------------

export interface Profile {
  schemaVersion: 1;
  sessionId: string;
  childCode: string;
  grade: 1;
  measures: Measures;
  descriptors: Descriptors;
  flags: Flag[];
  reliability: Reliability;
}

/**
 * Hand this to the prompt builder. Nothing else.
 * If a number reaches the model, it got there through a different function.
 */
export function promptView(p: Profile): {
  descriptors: Descriptors;
  flags: Flag[];
  reliability: Reliability;
} {
  return {
    descriptors: p.descriptors,
    flags: p.flags,
    reliability: p.reliability,
  };
}

// ---------------------------------------------------------------------------
// 7. Banding — measures to descriptors. Pure, testable, advisor-tunable.
//    THESE THRESHOLDS ARE PLACEHOLDERS. R4 replaces them.
// ---------------------------------------------------------------------------

const STRUGGLE_BELOW = 0.5;

function holds(acc: number | null): Holds {
  if (acc === null) return "unknown";
  return acc >= STRUGGLE_BELOW ? "holds" : "struggles";
}

export function describe(m: Measures): Descriptors {
  return {
    span:
      m.trialsAttempted < 6
        ? "unknown"
        : m.actionSpan >= 3
          ? "threeOrMore"
          : m.actionSpan === 2
            ? "two"
            : "one",
    orderHandling: holds(m.accuracy.reversed),
    negationHandling: holds(m.accuracy.negation),
    startsEarly: m.prematureStarts >= 3,
    asksForRepeats:
      m.replaysRequested === 0
        ? "never"
        : m.replaysRequested <= 3
          ? "sometimes"
          : "often",
    pace:
      m.medianFirstTapMs === null
        ? "unknown"
        : m.medianFirstTapMs < 800
          ? "quick"
          : m.medianFirstTapMs <= 3000
            ? "measured"
            : "slow",
  };
}

export function assessReliability(m: Measures): Reliability {
  if (m.trialsAttempted >= 10) return "ok";
  if (m.trialsAttempted >= 6) return "partial";
  return "insufficient";
}

// ---------------------------------------------------------------------------
// 8. Fixtures — build the generation half against these on Day 1,
//    before a single real tap exists.
// ---------------------------------------------------------------------------

const emptyAccuracy: Record<Dimension, number | null> = {
  baseline: null,
  twoActions: null,
  reversed: null,
  threeActions: null,
  negation: null,
};

/** Breaks at three actions, order is fine, asks for help. */
export const FIXTURE_TYPICAL_WITH_SHORT_SPAN: Profile = {
  schemaVersion: 1,
  sessionId: "demo-001",
  childCode: "NL-1A-07",
  grade: 1,
  measures: {
    actionSpan: 2,
    breakPoint: 3,
    accuracy: {
      baseline: 1.0,
      twoActions: 0.67,
      reversed: 0.5,
      threeActions: 0.0,
      negation: 0.0,
    },
    orderCost: 0.17,
    medianFirstTapMs: 1450,
    prematureStarts: 0,
    selfCorrections: 0,
    replaysRequested: 3,
    trialsAttempted: 12,
    trialsCompleted: 12,
  },
  descriptors: {
    span: "two",
    orderHandling: "holds",
    negationHandling: "struggles",
    startsEarly: false,
    asksForRepeats: "sometimes",
    pace: "measured",
  },
  flags: [],
  reliability: "ok",
};

/** Same span, never asks, starts before the instruction ends. Opposite manual. */
export const FIXTURE_SAME_SPAN_NO_MONITORING: Profile = {
  schemaVersion: 1,
  sessionId: "demo-002",
  childCode: "NL-1A-11",
  grade: 1,
  measures: {
    actionSpan: 2,
    breakPoint: 3,
    accuracy: {
      baseline: 1.0,
      twoActions: 0.67,
      reversed: 0.0,
      threeActions: 0.0,
      negation: 0.0,
    },
    orderCost: 0.67,
    medianFirstTapMs: 420,
    prematureStarts: 5,
    selfCorrections: 0,
    replaysRequested: 0,
    trialsAttempted: 12,
    trialsCompleted: 12,
  },
  descriptors: {
    span: "two",
    orderHandling: "struggles",
    negationHandling: "struggles",
    startsEarly: true,
    asksForRepeats: "never",
    pace: "quick",
  },
  flags: [],
  reliability: "ok",
};

/** Quit at trial four. The manual must say so and recommend nothing. */
export const FIXTURE_INSUFFICIENT: Profile = {
  schemaVersion: 1,
  sessionId: "demo-003",
  childCode: "NL-1B-02",
  grade: 1,
  measures: {
    actionSpan: 1,
    breakPoint: 2,
    accuracy: { ...emptyAccuracy, baseline: 1.0, twoActions: 0.0 },
    orderCost: null,
    medianFirstTapMs: 2100,
    prematureStarts: 0,
    selfCorrections: 0,
    replaysRequested: 1,
    trialsAttempted: 4,
    trialsCompleted: 3,
  },
  descriptors: {
    span: "unknown",
    orderHandling: "unknown",
    negationHandling: "unknown",
    startsEarly: false,
    asksForRepeats: "sometimes",
    pace: "measured",
  },
  flags: ["session_abandoned"],
  reliability: "insufficient",
};
