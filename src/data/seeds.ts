import type { Session, TrialResult } from "../types/profile";
import type { ManualSections } from "../types/manual";

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
  return { sessionId, childCode, grade: 1, startedAt: "2026-11-02T09:00:00.000Z", vocabCheckPassed: true, results };
}

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
  "Siguió bien instrucciones de dos pasos; cuando eran tres pasos, solía perder alguno. Aunque la instrucción dijera los pasos en otro orden, con \"antes de\" o \"después de\", en general los hizo en el orden correcto. Esperó a que terminara cada instrucción y se tomó un momento antes de responder. A veces pidió escuchar la instrucción otra vez.";

const EARLY_OBSERVED =
  "Siguió bien instrucciones de dos pasos; cuando eran tres pasos, solía perder alguno. Con frecuencia empezó a responder antes de que terminara la instrucción, y respondió rápido. Cuando la instrucción decía los pasos en otro orden, con \"antes de\" o \"después de\", le costó hacerlos en el orden correcto; también le costaron las instrucciones con \"no\" o con condiciones. No pidió escuchar la instrucción otra vez.";

// written by hand in the same voice the model is asked for, so the demo works with no network at all
export const SEEDS: Seed[] = [
  {
    id: "seed-a",
    label: "Ejemplo A: pide que le repitan",
    session: askerSession,
    manual: {
      classroom: {
        observed: ASKER_OBSERVED,
        toTry: [
          "- Una instrucción a la vez. Acércate, di su nombre y espera a que te mire. Da un solo paso: \"Saca tu cuaderno.\" Espera a que lo haga antes de decir lo siguiente. Cuando termine, da el siguiente paso: \"Ahora ábrelo donde está el separador.\"",
          "- Reconoce cuando pide ayuda. Cuando pida que repitas, responde: \"Qué bueno que preguntaste.\" Repite la instrucción igual, sin agregar palabras. Luego di: \"Siempre que lo necesites, pregúntame.\"",
        ].join("\n"),
        watchFor:
          "Termina cada paso sin que tengas que repetirlo. Pide que le repitan en el momento en que se pierde, no al final.",
      },
      home: {
        observed: ASKER_OBSERVED,
        toTry: [
          "- Una instrucción a la vez. Acércate, di su nombre y espera a que te mire. Da un solo paso: \"Lávate las manos.\" Espera a que lo haga antes de decir lo siguiente. Cuando termine, da el siguiente paso: \"Ahora siéntate a la mesa.\"",
          "- Reconoce cuando pide ayuda. Cuando pida que repitas, responde: \"Qué bueno que preguntaste.\" Repite la instrucción igual, sin agregar palabras. Luego di: \"Siempre que lo necesites, pregúntame.\"",
        ].join("\n"),
        watchFor:
          "Termina cada paso sin que tengas que repetirlo. Pide que le repitan en el momento en que se pierde, no al final.",
      },
    },
  },
  {
    id: "seed-b",
    label: "Ejemplo B: empieza antes de tiempo",
    session: earlyStarterSession,
    manual: {
      classroom: {
        observed: EARLY_OBSERVED,
        toTry: [
          "- Di los pasos en el orden en que se hacen. En lugar de \"Antes de salir al recreo, guarda tu libro\", di: \"Guarda tu libro. Luego sal al recreo.\" Usa siempre \"primero\" y \"luego\". Si lo hace en otro orden, repite igual: \"Primero esto, luego aquello.\"",
          "- Comprueba que se quedó con el paso. Da la instrucción una vez: \"Guarda los colores en la caja.\" Pregunta sin prisa: \"¿Qué vas a hacer?\" Si lo dice bien: \"Eso es, adelante.\" Si le falta algo, repite la instrucción con las mismas palabras.",
          "- Di lo que sí, no lo que no. En lugar de \"No corras\", di: \"Camina.\" En lugar de \"No tomes la azul\", di: \"Toma la roja.\" Revisa las instrucciones que más usas y cambia las que empiezan con \"no\".",
        ].join("\n"),
        watchFor:
          "Hace los pasos en el orden correcto sin que tengas que detenerle. Puede decir la instrucción con sus propias palabras antes de empezar, y responde a la primera, sin quedarse en lo que no debía hacer.",
      },
      home: {
        observed: EARLY_OBSERVED,
        toTry: [
          "- Di los pasos en el orden en que se hacen. En lugar de \"Antes de cenar, lávate las manos\", di: \"Lávate las manos. Luego siéntate a cenar.\" Usa siempre \"primero\" y \"luego\". Si lo hace en otro orden, repite igual: \"Primero esto, luego aquello.\"",
          "- Comprueba que se quedó con el paso. Da la instrucción una vez: \"Guarda los juguetes en la caja.\" Pregunta sin prisa: \"¿Qué vas a hacer?\" Si lo dice bien: \"Eso es, adelante.\" Si le falta algo, repite la instrucción con las mismas palabras.",
          "- Di lo que sí, no lo que no. En lugar de \"No grites\", di: \"Habla bajito.\" En lugar de \"No dejes tus zapatos ahí\", di: \"Pon tus zapatos en la entrada.\" Revisa las instrucciones que más usas y cambia las que empiezan con \"no\".",
        ].join("\n"),
        watchFor:
          "Hace los pasos en el orden correcto sin que tengas que detenerle. Puede decir la instrucción con sus propias palabras antes de empezar, y responde a la primera, sin quedarse en lo que no debía hacer.",
      },
    },
  },
];
