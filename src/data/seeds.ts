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
  trial("t09", [["y-s", 1600], ["r-s", 2700], ["b-c", 3600]]),
  trial("t10", [["b-c", 1400], ["r-s", 2400], ["y-s", 3500]]),
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
          "- Invítale a decir la instrucción. Di: \"Toma tu lápiz y escribe tu nombre.\" Luego pregunta: \"¿Me la dices tú?\" Al escucharla: \"Muy bien, ya la tienes.\" Si pide que la repitas, repítela igual, sin agregar palabras.",
          "- Tareas largas en tandas de dos. Anuncia: \"Son dos partes. Te digo la primera.\" Luego: \"Recorta la figura y pégala en la hoja.\" Al terminar: \"Ya va la segunda parte: colorea la figura y guarda las tijeras.\"",
          "- Dos pasos y una pausa. Di: \"Saca tu libro y ábrelo.\" Espera a que termine y continúa: \"Ahora lee el título y levanta la mano.\"",
        ].join("\n"),
        watchFor:
          "Dice la instrucción completa por su cuenta antes de empezar. En las tareas largas, espera o pregunta por la segunda parte en lugar de inventarla, y completa cada par de pasos sin quedarse a medias.",
      },
      home: {
        observed: ASKER_OBSERVED,
        toTry: [
          "- Invítale a decir la instrucción. Di: \"Lávate las manos y siéntate a la mesa.\" Luego pregunta: \"¿Me la dices tú?\" Al escucharla: \"Muy bien, ya la tienes.\" Si pide que la repitas, repítela igual, sin agregar palabras.",
          "- Tareas largas en tandas de dos. Anuncia: \"Son dos partes. Te digo la primera.\" Luego: \"Recoge tus juguetes y ponlos en la caja.\" Al terminar: \"Ya va la segunda parte: lleva la caja a tu cuarto y cierra la puerta.\"",
          "- Dos pasos y una pausa. Di: \"Ponte la pijama y lávate los dientes.\" Espera a que termine y continúa: \"Ahora escoge un cuento y ven a la cama.\"",
        ].join("\n"),
        watchFor:
          "Dice la instrucción completa por su cuenta antes de empezar. En los encargos largos, espera o pregunta por la segunda parte en lugar de inventarla, y completa cada par de pasos sin quedarse a medias.",
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
          "- Usa frases sencillas. Di una sola cosa por frase, con el verbo al principio: \"Guarda tu libro.\" Evita frases con \"que\" o \"cuando\" dentro: en lugar de \"El libro que está en tu mesa, guárdalo\", di: \"Guarda el libro de tu mesa.\" Si hace falta repetir, usa la misma frase corta.",
          "- Enseña a pedir que repitan. Enséñale una frase: \"Si no te acuerdas, puedes decir: ¿me lo repites?\" Practíquenla en un momento tranquilo, como un juego. Cuando la use, responde con gusto: \"Claro, te lo repito.\" Repite la instrucción con las mismas palabras.",
        ].join("\n"),
        watchFor:
          "Pide que le repitan cuando se pierde, sin que se lo sugieras. Hace lo que dice la frase corta sin que tengas que explicarla de nuevo, y hace los pasos en el orden correcto sin que tengas que detenerle.",
      },
      home: {
        observed: EARLY_OBSERVED,
        toTry: [
          "- Di los pasos en el orden en que se hacen. En lugar de \"Antes de cenar, lávate las manos\", di: \"Lávate las manos. Luego siéntate a cenar.\" Usa siempre \"primero\" y \"luego\". Si lo hace en otro orden, repite igual: \"Primero esto, luego aquello.\"",
          "- Muestra primero cómo se hace. Ponte frente a la niña o el niño y haz los pasos despacio, diciendo cada uno: \"Primero me lavo las manos. Luego me siento.\" Pide: \"Ahora tú.\" Espera a que haga los pasos sin ayudarle. Si se equivoca, vuelve a mostrarlo igual, sin regañar.",
        ].join("\n"),
        watchFor:
          "Hace los pasos en el orden en que los mostraste y, con el tiempo, en el orden correcto sin que tengas que detenerle.",
      },
    },
  },
];
