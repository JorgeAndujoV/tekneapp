import { describe, expect, it } from "vitest";
import { codeTrial } from "./computeProfile";
import { TRIALS } from "../data/trials";
import type { ErrorCode, Tap, WrongAttribute } from "../types/profile";

interface Row {
  n: number;
  trial: string;
  cards: string[];
  codes: ErrorCode[];
  early?: Tap[];
  extra?: Tap[];
  previous?: string;
  attribute?: WrongAttribute;
  reversed?: boolean;
}

const rows: Row[] = [
  { n: 1, trial: "t03", cards: ["b-c", "r-s"], codes: [] },
  { n: 2, trial: "t03", cards: ["b-c"], codes: ["E1"] },
  { n: 3, trial: "t08", cards: ["r-c", "b-s"], codes: ["E1"] },
  { n: 4, trial: "t08", cards: ["r-c", "y-c"], codes: ["E2"] },
  { n: 5, trial: "t08", cards: ["b-s", "y-c"], codes: ["E2"] },
  { n: 6, trial: "t03", cards: ["r-s", "b-c"], codes: ["E3"] },
  { n: 7, trial: "t06", cards: ["r-c", "b-s"], codes: ["E3"], reversed: true },
  { n: 8, trial: "t09", cards: ["y-s", "r-s", "b-c"], codes: ["E3"] },
  { n: 9, trial: "t05", cards: ["y-c", "b-c"], codes: ["E4"], attribute: "shape" },
  { n: 10, trial: "t05", cards: ["y-c", "y-s"], codes: ["E4"], attribute: "colour" },
  { n: 11, trial: "t01", cards: ["b-c"], codes: ["E4"], attribute: "colour" },
  { n: 12, trial: "t02", cards: ["b-c"], codes: ["E4"], attribute: "colourAndShape" },
  { n: 13, trial: "t04", cards: ["b-c", "r-s"], codes: ["E4", "E5"], previous: "t03", attribute: "colourAndShape" },
  { n: 14, trial: "t02", cards: ["r-c"], codes: ["E4", "E5"], previous: "t01", attribute: "colourAndShape" },
  { n: 15, trial: "t11", cards: ["b-s"], codes: ["E4", "E6"], attribute: "colour" },
  { n: 16, trial: "t12", cards: ["r-s"], codes: ["E4", "E6"], attribute: "colourAndShape" },
  { n: 17, trial: "t07", cards: [], codes: ["E8"] },
  { n: 18, trial: "t03", cards: ["b-c", "r-s"], codes: ["E7"], early: [{ cardId: "b-c", t: -300 }] },
  { n: 19, trial: "t03", cards: [], codes: ["E8", "E7"], early: [{ cardId: "r-s", t: -300 }] },
  { n: 20, trial: "t09", cards: ["y-s", "b-c"], codes: ["E1"], extra: [{ cardId: null, t: 2600 }] },
];

const find = (id: string) => TRIALS.find((trial) => trial.id === id)!;

describe("codeTrial", () => {
  it.each(rows)("row $n: $trial gives $codes", (row) => {
    const taps: Tap[] = [
      ...(row.early ?? []),
      ...row.cards.map((cardId, i) => ({ cardId, t: 900 + i * 700 })),
      ...(row.extra ?? []),
    ];
    const coded = codeTrial(
      { trialId: row.trial, taps, replayed: false, abandoned: false },
      find(row.trial),
      row.previous ? find(row.previous) : undefined,
    );
    expect(coded.codes).toEqual(row.codes);
    expect(coded.wrongAttribute).toBe(row.attribute);
    expect(coded.reversedItem).toBe(row.reversed);
  });
});
