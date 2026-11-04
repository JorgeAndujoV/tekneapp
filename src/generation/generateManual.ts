import { promptView, REFERRAL_FIRST, type Profile } from "../types/profile";
import type { ManualSections, ManualVersion, RailedManual } from "../types/manual";
import { matchStrategies } from "./matchStrategies";
import { buildPrompt } from "./buildPrompt";
import { applyRails } from "./applyRails";

const CLIENT_TIMEOUT_MS = 40_000;

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

function parseVersion(value: unknown): ManualVersion | null {
  const v = value as Record<string, unknown> | null;
  const observed = asText(v?.observed);
  const toTry = asText(v?.toTry);
  const watchFor = asText(v?.watchFor);
  return observed && toTry && watchFor ? { observed, toTry, watchFor } : null;
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
export function parseSections(text: string): ManualSections {
  const unfenced = text.replace(/```(?:json)?/gi, "");
  for (const source of [unfenced, text]) {
    for (let i = source.indexOf("{"); i !== -1; i = source.indexOf("{", i + 1)) {
      const candidate = matchBraces(source, i);
      if (!candidate) continue;
      try {
        const data = JSON.parse(candidate);
        const classroom = parseVersion(data?.classroom);
        const home = parseVersion(data?.home);
        if (classroom && home) return { classroom, home };
      } catch {}
    }
  }
  throw new GenerationError("La respuesta del modelo no tuvo el formato esperado. Puedes intentarlo de nuevo.");
}

// this is the one network call in the app
export async function generateManual(profile: Profile): Promise<RailedManual> {
  if (REFERRAL_FIRST.some((flag) => profile.flags.includes(flag))) return applyRails(REFERRAL_SECTIONS, profile.flags);

  const strategies = matchStrategies(profile);
  if (strategies.length === 0) return applyRails(INSUFFICIENT_SECTIONS, profile.flags);

  const messages = buildPrompt(promptView(profile), strategies);

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

  return applyRails(parseSections(data.text), profile.flags);
}
