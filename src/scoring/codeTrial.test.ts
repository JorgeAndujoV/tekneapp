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
  { n: 1, trial: "t03", cards: ["blue-a1", "red-a2"], codes: [] },
  { n: 2, trial: "t03", cards: ["blue-a1"], codes: ["E1"] },
  { n: 3, trial: "t08", cards: ["red-a1", "blue-a2"], codes: ["E1"] },
  { n: 4, trial: "t08", cards: ["red-a1", "yellow-a1"], codes: ["E2"] },
  { n: 5, trial: "t08", cards: ["blue-a2", "yellow-a1"], codes: ["E2"] },
  { n: 6, trial: "t03", cards: ["red-a2", "blue-a1"], codes: ["E3"] },
  { n: 7, trial: "t06", cards: ["red-a1", "blue-a2"], codes: ["E3"], reversed: true },
  { n: 8, trial: "t09", cards: ["yellow-a2", "red-a2", "blue-a1"], codes: ["E3"] },
  { n: 9, trial: "t05", cards: ["yellow-a1", "blue-a1"], codes: ["E4"], attribute: "animal" },
  { n: 10, trial: "t05", cards: ["yellow-a1", "yellow-a2"], codes: ["E4"], attribute: "colour" },
  { n: 11, trial: "t01", cards: ["blue-a1"], codes: ["E4"], attribute: "colour" },
  { n: 12, trial: "t02", cards: ["blue-a1"], codes: ["E4"], attribute: "animalAndColour" },
  { n: 13, trial: "t04", cards: ["blue-a1", "red-a2"], codes: ["E4", "E5"], previous: "t03", attribute: "animalAndColour" },
  { n: 14, trial: "t02", cards: ["red-a1"], codes: ["E4", "E5"], previous: "t01", attribute: "animalAndColour" },
  { n: 15, trial: "t11", cards: ["blue-a2"], codes: ["E4", "E6"], attribute: "colour" },
  { n: 16, trial: "t12", cards: ["red-a2"], codes: ["E4", "E6"], attribute: "animalAndColour" },
  { n: 17, trial: "t07", cards: [], codes: ["E8"] },
  { n: 18, trial: "t03", cards: ["blue-a1", "red-a2"], codes: ["E7"], early: [{ cardId: "blue-a1", t: -300 }] },
  { n: 19, trial: "t03", cards: [], codes: ["E8", "E7"], early: [{ cardId: "red-a2", t: -300 }] },
  { n: 20, trial: "t09", cards: ["yellow-a2", "blue-a1"], codes: ["E1"], extra: [{ cardId: null, t: 2600 }] },
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

  it("reads the final selection when there is one, so a card taken back is not an error", () => {
    const taps: Tap[] = [
      { cardId: "blue-a1", t: 900 },
      { cardId: "yellow-a1", t: 1500 },
      { cardId: "yellow-a1", t: 2100 },
      { cardId: "red-a2", t: 2700 },
    ];
    const finalSelection: Tap[] = [
      { cardId: "blue-a1", t: 900 },
      { cardId: "red-a2", t: 2700 },
    ];
    const coded = codeTrial({ trialId: "t03", taps, finalSelection, selfCorrections: 1, replayed: false, abandoned: false }, find("t03"));
    expect(coded.codes).toEqual([]);
  });

  it("counts a card chosen during the audio as part of the answer and also as E7", () => {
    const taps: Tap[] = [
      { cardId: "blue-a1", t: -300 },
      { cardId: "red-a2", t: 900 },
    ];
    const finalSelection: Tap[] = taps;
    const coded = codeTrial({ trialId: "t03", taps, finalSelection, selfCorrections: 0, replayed: false, abandoned: false }, find("t03"));
    expect(coded.codes).toEqual(["E7"]);
  });
});
