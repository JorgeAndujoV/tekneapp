import { promptView, REFERRAL_FIRST, type Profile } from "../types/profile";
import type { ManualSections, RailedManual, Strategy } from "../types/manual";
import { candidatesFor, matchStrategies, selectStrategies } from "./matchStrategies";
import { withStrategies, type Examples } from "./strategyText";
import { buildPrompt, describeProfile } from "./buildPrompt";
import { applyRails, survivesRails } from "./applyRails";
import { finalContext, hasContext, NO_CONTEXT, type Context } from "./context";
import { copiesNote, keepsFrame } from "./copyGuard";
import { finalObservation } from "./observations";

const MAX_EXAMPLE_LENGTH = 240;

const CLIENT_TIMEOUT_MS = 60_000;

// fixed text for a session too short to read: no model call, no strategies
export const INSUFFICIENT_SECTIONS: ManualSections = {
  classroom: {
    observed: "La sesión fue demasiado corta para describir cómo sigue instrucciones habladas.",
    toTry:
      "Por ahora no recomendamos estrategias: con tan pocas respuestas, cualquier recomendación sería una suposición. Si es posible, repitan la tarea otro día, en un momento tranquilo.",
    watchFor:
      "En clase, anoten ejemplos concretos de instrucciones que sigue sin problema y de las que no, para compartirlos con un profesional.",
  },
  home: {
    observed: "La sesión fue demasiado corta para describir cómo sigue instrucciones habladas.",
    toTry:
      "Por ahora no recomendamos estrategias: con tan pocas respuestas, cualquier recomendación sería una suposición. Si es posible, repitan la tarea otro día, en un momento tranquilo.",
    watchFor:
      "En casa, anoten ejemplos concretos de instrucciones que sigue sin problema y de las que no, para compartirlos con un profesional.",
  },
};

export const REFERRAL_SECTIONS: ManualSections = {
  classroom: {
    observed: "En esta ocasión no se describe cómo sigue instrucciones.",
    toTry: "Por ahora no proponemos estrategias. Primero sigan la recomendación del aviso de arriba.",
    watchFor:
      "En clase, anoten ejemplos concretos de instrucciones que sigue sin problema y de las que no, para compartirlos con un profesional.",
  },
  home: {
    observed: "En esta ocasión no se describe cómo sigue instrucciones.",
    toTry: "Por ahora no proponemos estrategias. Primero sigan la recomendación del aviso de arriba.",
    watchFor:
      "En casa, anoten ejemplos concretos de instrucciones que sigue sin problema y de las que no, para compartirlos con un profesional.",
  },
};

export class GenerationError extends Error {}

function asText(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value;
  if (Array.isArray(value) && value.every((v) => typeof v === "string")) return value.join("\n");
  return null;
}

interface Reply {
  observed: { classroom: string; home: string };
  toTry: { classroom: string; home: string };
  watchFor: { classroom: string; home: string };
}

function parseVersion(value: unknown): { observed: string; toTry: string; watchFor: string } | null {
  const v = value as Record<string, unknown> | null;
  const observed = asText(v?.observed);
  const text = (field: unknown) => (typeof field === "string" ? field : "");
  return observed ? { observed, toTry: text(v?.toTry), watchFor: text(v?.watchFor) } : null;
}

// returns the substring from `start` to its matching "}", or null if braces never balance;
// used to pull out one candidate object without assuming the LAST "}" in the text is the right one
function matchBraces(text: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

// tries every "{" in the text as a possible start, so a stray unmatched brace in commentary
// before or after the real object (or a ```json fence around it) doesn't break the extraction
export function parseReply(text: string): Reply {
  const unfenced = text.replace(/```(?:json)?/gi, "");
  for (const source of [unfenced, text]) {
    for (let i = source.indexOf("{"); i !== -1; i = source.indexOf("{", i + 1)) {
      const candidate = matchBraces(source, i);
      if (!candidate) continue;
      try {
        const data = JSON.parse(candidate);
        const classroom = parseVersion(data?.classroom);
        const home = parseVersion(data?.home);
        if (classroom && home) {
          return {
            observed: { classroom: classroom.observed, home: home.observed },
            toTry: { classroom: classroom.toTry, home: home.toTry },
            watchFor: { classroom: classroom.watchFor, home: home.watchFor },
          };
        }
      } catch {}
    }
  }
  throw new GenerationError("La respuesta del modelo no tuvo el formato esperado. Puedes intentarlo de nuevo.");
}

export type ExampleVerdict =
  | { ok: true; strategy: Strategy; text: string }
  | { ok: false; reason: "format" | "unknown" | "long" | "digit" | "rails" | "copy" | "far" };

type Setting = "classroom" | "home";

const OBSERVED_COPY_RUN = 3;
const EXAMPLE_COPY_RUN = 6;
const FRAME_SHARE = 0.3;

export function checkExampleLine(line: string, candidates: Strategy[], setting: Setting, notes: string[]): ExampleVerdict {
  const match = line.match(/^\s*-?\s*([A-Z])\s*:\s*(.+)$/);
  if (!match) return { ok: false, reason: "format" };
  const strategy = candidates[match[1].charCodeAt(0) - 65];
  const text = match[2].trim();
  if (!strategy) return { ok: false, reason: "unknown" };
  if (text.length > MAX_EXAMPLE_LENGTH) return { ok: false, reason: "long" };
  if (/\d/.test(text)) return { ok: false, reason: "digit" };
  if (!survivesRails(text)) return { ok: false, reason: "rails" };
  if (notes.some((note) => copiesNote(text, note, EXAMPLE_COPY_RUN))) return { ok: false, reason: "copy" };
  if (!keepsFrame(strategy.example[setting], text, FRAME_SHARE)) return { ok: false, reason: "far" };
  return { ok: true, strategy, text };
}

export function adaptedExamples(
  toTry: string,
  strategies: Strategy[],
  setting: Setting,
  context: Context,
  hasObservation = false,
): Record<string, string> {
  const found: Record<string, string> = {};
  if (context[setting] === "" && !hasObservation) return found;
  const notes = [context.classroom, context.home].filter((note) => note !== "");
  for (const line of toTry.split("\n")) {
    const verdict = checkExampleLine(line, strategies, setting, notes);
    if (verdict.ok) found[verdict.strategy.id] = verdict.text;
  }
  return found;
}

export function safeObserved(text: string, notes: string[], profile: Profile): string {
  if (!notes.some((note) => copiesNote(text, note, OBSERVED_COPY_RUN))) return text;
  return describeProfile(promptView(profile).descriptors).slice(0, 5).join(" ");
}

export function chosenStrategies(watchFor: string, candidates: Strategy[]): Strategy[] {
  const letters = watchFor.match(/[A-Z]/g) ?? [];
  const chosen = letters.flatMap((letter) => candidates[letter.charCodeAt(0) - 65] ?? []);
  return chosen.filter((strategy, i) => chosen.indexOf(strategy) === i);
}

export async function generateManual(
  profile: Profile,
  situations: Context = NO_CONTEXT,
  observation = "",
): Promise<RailedManual> {
  if (REFERRAL_FIRST.some((flag) => profile.flags.includes(flag))) return applyRails(REFERRAL_SECTIONS, profile.flags);

  const matched = matchStrategies(profile);
  if (matched.length === 0) return applyRails(INSUFFICIENT_SECTIONS, profile.flags);

  const context = finalContext(situations);
  const note = finalObservation(observation);
  const personalize = hasContext(context) || note !== "";
  const candidates = personalize ? candidatesFor(profile) : matched;
  const messages = buildPrompt(promptView(profile), candidates, context, note);

  let response: Response;
  try {
    response = await fetch("/api/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages }),
      signal: AbortSignal.timeout(CLIENT_TIMEOUT_MS),
    });
  } catch {
    throw new GenerationError("No se pudo contactar al servidor de la aplicación. Revisa la conexión.");
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) throw new GenerationError(data?.error ?? "No se pudo generar el manual.");
  if (typeof data?.text !== "string") throw new GenerationError("El servidor devolvió una respuesta vacía.");

  const reply = parseReply(data.text);
  const examples: Examples = {
    classroom: adaptedExamples(reply.toTry.classroom, candidates, "classroom", context, note !== ""),
    home: adaptedExamples(reply.toTry.home, candidates, "home", context, note !== ""),
  };
  const notes = [context.classroom, context.home].filter((note) => note !== "");
  const observed = {
    classroom: safeObserved(reply.observed.classroom, notes, profile),
    home: safeObserved(reply.observed.home, notes, profile),
  };
  const shown = personalize
    ? selectStrategies(profile, chosenStrategies(reply.watchFor.classroom || reply.watchFor.home, candidates))
    : matched;
  return applyRails(withStrategies(observed, shown, examples), profile.flags, shown);
}

export function strategiesFor(profile: Profile): Strategy[] {
  return REFERRAL_FIRST.some((flag) => profile.flags.includes(flag)) ? [] : matchStrategies(profile);
}
