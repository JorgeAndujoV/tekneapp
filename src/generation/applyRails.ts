import type { Flag } from "../types/profile";
import type { ManualSections, ManualVersion, RailedManual, Strategy } from "../types/manual";

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
  "autis",
  "asperger",
  "tdah",
  "deficit",
  "hiperactiv",
  "dislexi",
  "discalculi",
  "disgrafi",
  "dispraxi",
  "disfasi",
  "tartamude",
  "tourette",
  "epilepsi",
  "paralisis cerebral",
  "sindrome",
  "discapacidad",
  "retraso",
  "mutismo",
  "hipoacusi",
  "sordera",
  "neurodiverg",
  "enfermedad",
  "patolog",
  "trastorno",
  "diagnos",
  "tamizaje",
  "screening",
  "deteccion temprana",
  "riesgo",
  "monitoreo",
  "autism",
  "adhd",
  "dyslexia",
  "disorder",
  "syndrome",
];

export const BLOCKED_ACRONYMS = ["tea", "tel", "tda", "tod", "tgd", "tdi", "asd"];

export const LIMITS =
  "Cuando a una niña o a un niño le cuesta seguir instrucciones, puede haber varias razones que esta tarea no separa: la audición, el lenguaje, el ruido del lugar o la memoria. Por eso este manual solo describe lo que hizo. Conviene revisar la audición si mira la boca de quien habla o gira la cabeza para escuchar, si pide que le repitan casi siempre, o si en el salón o en casa responde mucho peor que en esta tarea tranquila. También influye el idioma que se habla en casa.";

export const VALIDITY_NOTICES: Partial<Record<Flag, string>> = {
  red_flag:
    "Aviso importante: la persona adulta indicó una señal que necesita atención profesional pronto: pérdida de habilidades que ya tenía, que se haga daño a sí misma o a sí mismo, o posibles señales de maltrato. Este manual no sustituye esa atención. Busquen apoyo profesional lo antes posible.",
  distress_stop:
    "La sesión se detuvo porque la niña o el niño estaba molesto o se negó a continuar. No se calificó nada y no se proponen estrategias. Pueden intentarlo otro día, en un momento tranquilo, o consultar a una persona especialista.",
  vocab_check_failed:
    "Aviso de validez: en el calentamiento, la niña o el niño no identificó con seguridad los colores o las formas. Por eso, este resultado refleja sobre todo si conoce esas palabras, no su memoria para seguir instrucciones. Antes de probar estrategias, conviene revisar ese vocabulario y, si no mejora, la audición y el lenguaje.",
  baseline_failed:
    "Aviso de validez: no completó las instrucciones más sencillas, de un solo paso. Esto puede tener que ver con la audición, la atención o la comprensión, más que con la longitud de las instrucciones, y es lo primero que conviene revisar.",
  most_failed:
    "Aviso de validez: no completó bien la mayoría de las instrucciones. Esto puede tener que ver con la audición o el lenguaje más que con la memoria. Antes de probar estrategias, conviene una revisión de la audición y una valoración del lenguaje.",
  replays_often:
    "Aviso de validez: pidió escuchar la instrucción otra vez en la mayoría de los casos. Antes de probar estrategias, conviene una revisión de la audición.",
  many_no_response:
    "Aviso de validez: no respondió a muchas de las instrucciones, por lo que no se puede describir cómo las sigue. Antes de probar estrategias, conviene consultar a una persona especialista.",
  session_abandoned:
    "Aviso de validez: la sesión terminó demasiado pronto para describir cómo sigue instrucciones. Lo que aparece aquí no debe usarse para sacar conclusiones.",
  home_language:
    "Aviso: en casa se habla otro idioma, o está aprendiendo español. Interpreten este resultado con cautela: puede reflejar el idioma más que la memoria. Si es posible, busquen una valoración en su idioma.",
};

const CLOSING_BASE =
  "Este manual no es un diagnóstico. Describe lo que una niña o un niño hizo en una tarea corta, en un solo día, y no dice nada sobre la causa. Es un apoyo educativo para personas adultas: no sirve para diagnosticar, detectar trastornos ni tomar decisiones clínicas.";

const CLOSING_CONSIDER =
  "Una evaluación profesional (por ejemplo, en psicología, comunicación humana o neuropediatría) es el siguiente paso adecuado siempre que esté a su alcance. Consideren buscarla.";

const CLOSING_PRIORITIZE =
  "Den prioridad a una evaluación profesional (por ejemplo, en psicología, comunicación humana o neuropediatría) en cuanto esté a su alcance: este resultado lleva un aviso de validez, lo que significa que no puede leerse tal cual, y una persona especialista puede revisar lo que esta tarea no logró medir.";

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function namesCondition(sentence: string): boolean {
  const plain = normalize(sentence);
  return (
    BLOCKED_TERMS.some((term) => new RegExp(`(^|[^a-z])${term}`).test(plain)) ||
    BLOCKED_ACRONYMS.some((acronym) => new RegExp(`(^|[^a-z])${acronym}(?![a-z])`).test(plain))
  );
}

// a global regexp keeps a lastIndex; reset it before every independent .test() or it misses matches
function hasScore(sentence: string): boolean {
  return SCORE_PATTERNS.some((pattern) => {
    pattern.lastIndex = 0;
    return pattern.test(sentence);
  });
}

// splits on sentence-ending punctuation, but not on a "." sitting between two digits
// (a decimal score like "0.67" must stay one sentence, or stripScores can't catch it whole)
function splitSentences(line: string): string[] {
  const sentences: string[] = [];
  let start = 0;
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === "." || ch === "!" || ch === "?" || ch === "…") {
      const isDecimalPoint = ch === "." && /\d/.test(line[i - 1] ?? "") && /\d/.test(line[i + 1] ?? "");
      if (!isDecimalPoint) {
        let end = i + 1;
        while (end < line.length && /[.!?…]/.test(line[end])) end++;
        while (end < line.length && /\s/.test(line[end])) end++;
        sentences.push(line.slice(start, end));
        start = end;
        i = end;
        continue;
      }
    }
    i++;
  }
  if (start < line.length) sentences.push(line.slice(start));
  return sentences;
}

// drops whole sentences that match `unwanted`, instead of cutting out just the matched text,
// which used to leave grammatically broken sentences behind (e.g. a dangling "Tiene una y...")
function removeSentences(text: string, unwanted: (sentence: string) => boolean): string {
  return text
    .split("\n")
    .flatMap((line) => {
      if (line.trim() === "") return [line];
      const kept = splitSentences(line).filter((s) => !unwanted(s)).join("");
      return kept.trim() ? [kept] : [];
    })
    .join("\n");
}

function stripScores(text: string): string {
  return removeSentences(text, hasScore);
}

function stripConditions(text: string): string {
  return removeSentences(text, namesCondition);
}

function tidy(text: string): string {
  return text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([.,;:!?])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .trim();
}

export function survivesRails(text: string): boolean {
  return railText(text) === tidy(text);
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

export function applyRails(sections: ManualSections, flags: Flag[], strategies: Strategy[] = []): RailedManual {
  const notices = flags.flatMap((flag) => VALIDITY_NOTICES[flag] ?? []);
  return {
    notices,
    sections: { classroom: railVersion(sections.classroom), home: railVersion(sections.home) },
    limits: LIMITS,
    strategies,
    closing: `${CLOSING_BASE} ${flags.includes("priority_referral") ? CLOSING_PRIORITIZE : CLOSING_CONSIDER}`,
  };
}
