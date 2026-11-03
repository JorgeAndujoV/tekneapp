import type { Flag } from "../types/profile";
import type { ManualSections, ManualVersion, RailedManual } from "../types/manual";

// everything in this file is fixed text and fixed rules: the model never writes or changes it

const NUMBER = String.raw`\d+(?:[.,]\d+)?`;

const SCORE_PATTERNS: RegExp[] = [
  new RegExp(String.raw`edad\s+(?:\w+\s+)?de\s+${NUMBER}\s*(?:años|meses)?`, "gi"),
  new RegExp(String.raw`${NUMBER}\s*(?:%|por\s*ciento)`, "gi"),
  new RegExp(String.raw`(?:percentil|puntaje|puntuación|calificación|nivel)\s*:?\s*(?:de\s+)?${NUMBER}`, "gi"),
  new RegExp(String.raw`${NUMBER}\s*(?:\/|de|sobre)\s*${NUMBER}`, "gi"),
  new RegExp(String.raw`${NUMBER}\s*(?:puntos?|años|meses|aciertos?)`, "gi"),
  new RegExp(String.raw`(?<!\d)0[.,]\d+`, "g"),
];

// compared without accents or capitals; extend this list as the clinical team sees fit
export const BLOCKED_TERMS = [
  "autismo",
  "autista",
  "asperger",
  "tdah",
  "deficit de atencion",
  "hiperactividad",
  "dislexia",
  "trastorno",
  "diagnostico",
  "diagnosticar",
];

export const VALIDITY_NOTICES: Partial<Record<Flag, string>> = {
  vocab_check_failed:
    "Aviso de validez: en el calentamiento, la niña o el niño no identificó con seguridad los colores o las formas. Por eso, este resultado refleja sobre todo si conoce esas palabras, no su memoria para seguir instrucciones. Conviene revisar primero ese vocabulario.",
  baseline_failed:
    "Aviso de validez: no completó las instrucciones más sencillas, de un solo paso. Esto puede tener que ver con la audición, la atención o la comprensión, más que con la longitud de las instrucciones, y es lo primero que conviene revisar.",
  session_abandoned:
    "Aviso de validez: la sesión terminó demasiado pronto para describir cómo sigue instrucciones. Lo que aparece aquí no debe usarse para sacar conclusiones.",
};

const CLOSING_BASE =
  "Este manual no es un diagnóstico. Describe lo que una niña o un niño hizo en una tarea corta, en un solo día, y no dice nada sobre la causa.";

const CLOSING_CONSIDER =
  "Una evaluación profesional (por ejemplo, en psicología, comunicación humana o neuropediatría) es el siguiente paso adecuado siempre que esté a su alcance. Consideren buscarla.";

const CLOSING_PRIORITIZE =
  "Den prioridad a una evaluación profesional (por ejemplo, en psicología, comunicación humana o neuropediatría) en cuanto esté a su alcance: este resultado lleva un aviso de validez, lo que significa que no puede leerse tal cual, y una persona especialista puede revisar lo que esta tarea no logró medir.";

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function namesCondition(sentence: string): boolean {
  const plain = normalize(sentence);
  return BLOCKED_TERMS.some((term) => new RegExp(`(^|[^a-z])${term}`).test(plain));
}

function stripScores(text: string): string {
  return SCORE_PATTERNS.reduce((out, pattern) => out.replace(pattern, ""), text);
}

function stripConditions(text: string): string {
  return text
    .split("\n")
    .flatMap((line) => {
      if (line.trim() === "") return [line];
      const kept = (line.match(/[^.!?…]+[.!?…]*\s*/g) ?? []).filter((s) => !namesCondition(s)).join("");
      return kept.trim() ? [kept] : [];
    })
    .join("\n");
}

function tidy(text: string): string {
  return text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([.,;:!?])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .trim();
}

function railText(text: string): string {
  return tidy(stripConditions(stripScores(text)));
}

function railVersion(version: ManualVersion): ManualVersion {
  return {
    observed: railText(version.observed),
    toTry: railText(version.toTry),
    watchFor: railText(version.watchFor),
  };
}

export function applyRails(sections: ManualSections, flags: Flag[]): RailedManual {
  const notices = flags.flatMap((flag) => VALIDITY_NOTICES[flag] ?? []);
  return {
    notices,
    sections: { classroom: railVersion(sections.classroom), home: railVersion(sections.home) },
    closing: `${CLOSING_BASE} ${notices.length > 0 ? CLOSING_PRIORITIZE : CLOSING_CONSIDER}`,
  };
}
