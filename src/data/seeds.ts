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
  trial("t01", [["b-s", 2600]], { replayed: true }),
  trial("t02", [["r-s", 2800]], { replayed: true }),
  trial("t03", [["r-c", 2500], ["y-c", 3600]], { replayed: true }),
  trial("t04", [["b-c", 2400], ["b-s", 3500]], { replayed: true }),
  trial("t05", [["r-s", 2600], ["r-c", 3700]], { replayed: true }),
  trial("t06", [["y-s", 2500], ["y-c", 3500]], { replayed: true }),
  trial("t07", [["b-c", 2300], ["b-s", 3300]], { replayed: true }),
  trial("t08", [["y-c", 2500], ["r-s", 3500], ["b-c", 4500]], { replayed: true }),
  trial("t09", [["r-c", 2600], ["y-c", 3600], ["b-s", 4600]]),
  trial("t10", [["y-s", 2400], ["b-s", 3400], ["r-c", 4400]]),
  trial("t11", [["b-s", 2700]]),
  trial("t12", [["y-s", 2900]]),
]);

// span of two, keeps the order, asks to hear the instruction again
const askerSession = session("seed-a", "DEMO-A", [
  trial("t01", [["r-c", 1300]]),
  trial("t02", [["y-s", 1600]]),
  trial("t03", [["b-c", 1400], ["r-s", 2500]]),
  trial("t04", [["y-s", 1800], ["r-c", 2900]], { replayed: true }),
  trial("t05", [["y-c", 1500], ["b-s", 2600]]),
  trial("t06", [["b-s", 2100], ["r-c", 3300]], { replayed: true }),
  trial("t07", [["r-s", 1700], ["y-c", 2800]]),
  trial("t08", [["r-c", 1900], ["b-s", 3100]], { replayed: true, abandoned: true }),
  trial("t09", [["y-s", 1600], ["b-c", 2700]], { abandoned: true }),
  trial("t10", [["b-c", 1400], ["r-s", 2400]], { abandoned: true }),
  trial("t11", [["r-s", 2200]]),
  trial("t12", [["r-s", 2000]]),
]);

// same span of two, starts before the instruction ends, never asks, follows the order of mention
const earlyStarterSession = session("seed-b", "DEMO-B", [
  trial("t01", [["r-c", -400], ["r-c", 250]]),
  trial("t02", [["y-s", 300]]),
  trial("t03", [["b-c", -600], ["b-c", 280], ["r-s", 650]]),
  trial("t04", [["y-s", 240], ["r-c", 600]]),
  trial("t05", [["b-s", 310], ["y-c", 700]]),
  trial("t06", [["r-c", -900], ["r-c", 200], ["b-s", 560]]),
  trial("t07", [["y-c", 350], ["r-s", 720]]),
  trial("t08", [["y-s", -500], ["r-c", 260], ["b-s", 640]], { abandoned: true }),
  trial("t09", [["y-s", 330], ["r-s", 690], ["b-c", 1000]]),
  trial("t10", [["b-c", 290], ["y-s", 640], ["r-s", 980]]),
  trial("t11", [["b-s", 270]]),
  trial("t12", [["r-s", 380]]),
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
