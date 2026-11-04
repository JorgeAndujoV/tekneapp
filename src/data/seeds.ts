import type { Session, TrialResult } from "../types/profile";
import type { ManualSections } from "../types/manual";
import { REFERRAL_SECTIONS, strategiesFor } from "../generation/generateManual";
import { withStrategies } from "../generation/strategyText";
import { computeProfile } from "../scoring/computeProfile";
import { TRIALS } from "./trials";

export interface Seed {
  id: string;
  label: string;
  session: Session;
  manual: ManualSections;
}

function trial(
  trialId: string,
  taps: [string | null, number][],
  options: { replayed?: boolean; abandoned?: boolean } = {},
): TrialResult {
  return {
    trialId,
    taps: taps.map(([cardId, t]) => ({ cardId, t })),
    replayed: options.replayed ?? false,
    abandoned: options.abandoned ?? false,
  };
}

function session(sessionId: string, childCode: string, results: TrialResult[]): Session {
  return {
    sessionId,
    childCode,
    grade: 1,
    startedAt: "2026-11-02T09:00:00.000Z",
    vocabCheckPassed: true,
    results,
    redFlag: false,
    homeLanguageNotSpanish: false,
    stoppedForDistress: false,
  };
}

const referralSession = session("seed-c", "DEMO-C", [
  trial("t01", [["blue-a2", 2600]], { replayed: true }),
  trial("t02", [["red-a2", 2800]], { replayed: true }),
  trial("t03", [["red-a1", 2500], ["yellow-a1", 3600]], { replayed: true }),
  trial("t04", [["blue-a1", 2400], ["blue-a2", 3500]], { replayed: true }),
  trial("t05", [["red-a2", 2600], ["red-a1", 3700]], { replayed: true }),
  trial("t06", [["yellow-a2", 2500], ["yellow-a1", 3500]], { replayed: true }),
  trial("t07", [["blue-a1", 2300], ["blue-a2", 3300]], { replayed: true }),
  trial("t08", [["yellow-a1", 2500], ["red-a2", 3500], ["blue-a1", 4500]], { replayed: true }),
  trial("t09", [["red-a1", 2600], ["yellow-a1", 3600], ["blue-a2", 4600]]),
  trial("t10", [["yellow-a2", 2400], ["blue-a2", 3400], ["red-a1", 4400]]),
  trial("t11", [["blue-a2", 2700]]),
  trial("t12", [["yellow-a2", 2900]]),
]);

// span of two, keeps the order, asks to hear the instruction again
const askerSession = session("seed-a", "DEMO-A", [
  trial("t01", [["red-a1", 1300]]),
  trial("t02", [["yellow-a2", 1600]]),
  trial("t03", [["blue-a1", 1400], ["red-a2", 2500]]),
  trial("t04", [["yellow-a2", 1800], ["red-a1", 2900]], { replayed: true }),
  trial("t05", [["yellow-a1", 1500], ["blue-a2", 2600]]),
  trial("t06", [["blue-a2", 2100], ["red-a1", 3300]], { replayed: true }),
  trial("t07", [["red-a2", 1700], ["yellow-a1", 2800]]),
  trial("t08", [["red-a1", 1900], ["blue-a2", 3100]], { replayed: true, abandoned: true }),
  trial("t09", [["yellow-a2", 1600], ["blue-a1", 2700]], { abandoned: true }),
  trial("t10", [["blue-a1", 1400], ["red-a2", 2400]], { abandoned: true }),
  trial("t11", [["red-a2", 2200]]),
  trial("t12", [["red-a2", 2000]]),
]);

// same span of two, starts before the instruction ends, never asks, follows the order of mention
const earlyStarterSession = session("seed-b", "DEMO-B", [
  trial("t01", [["red-a1", -400], ["red-a1", 250]]),
  trial("t02", [["yellow-a2", 300]]),
  trial("t03", [["blue-a1", -600], ["blue-a1", 280], ["red-a2", 650]]),
  trial("t04", [["yellow-a2", 240], ["red-a1", 600]]),
  trial("t05", [["blue-a2", 310], ["yellow-a1", 700]]),
  trial("t06", [["red-a1", -900], ["red-a1", 200], ["blue-a2", 560]]),
  trial("t07", [["yellow-a1", 350], ["red-a2", 720]]),
  trial("t08", [["yellow-a2", -500], ["red-a1", 260], ["blue-a2", 640]], { abandoned: true }),
  trial("t09", [["yellow-a2", 330], ["red-a2", 690], ["blue-a1", 1000]]),
  trial("t10", [["blue-a1", 290], ["yellow-a2", 640], ["red-a2", 980]]),
  trial("t11", [["blue-a2", 270]]),
  trial("t12", [["red-a2", 380]]),
]);

const ASKER_OBSERVED =
  "Siguió bien instrucciones de dos pasos; cuando eran tres pasos, solía perder alguno. Aunque la instrucción dijera los pasos en otro orden, con \"antes de\" o \"después de\", en general los hizo en el orden correcto. Esperó a que terminara cada instrucción. A veces pidió escuchar la instrucción otra vez.";

const EARLY_OBSERVED =
  "Siguió bien instrucciones de dos pasos; cuando eran tres pasos, solía perder alguno. Con frecuencia empezó a responder antes de que terminara la instrucción. Cuando la instrucción decía los pasos en otro orden, con \"antes de\" o \"después de\", le costó hacerlos en el orden correcto; también le costaron las instrucciones con \"no\" o con condiciones. No pidió escuchar la instrucción otra vez.";

function manualFor(session: Session, observed: string): ManualSections {
  return withStrategies({ classroom: observed, home: observed }, strategiesFor(computeProfile(session, TRIALS)));
}

export const SEEDS: Seed[] = [
  {
    id: "seed-a",
    label: "Ejemplo A: pide que le repitan",
    session: askerSession,
    manual: manualFor(askerSession, ASKER_OBSERVED),
  },
  {
    id: "seed-b",
    label: "Ejemplo B: empieza antes de tiempo",
    session: earlyStarterSession,
    manual: manualFor(earlyStarterSession, EARLY_OBSERVED),
  },
  {
    id: "seed-c",
    label: "Ejemplo C: primero revisar audición y lenguaje",
    session: referralSession,
    manual: REFERRAL_SECTIONS,
  },
];
