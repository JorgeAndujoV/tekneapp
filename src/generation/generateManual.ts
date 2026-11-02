import { promptView, type Profile } from "../types/profile";
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

export function parseSections(text: string): ManualSections {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  try {
    const data = JSON.parse(text.slice(start, end + 1));
    const classroom = parseVersion(data?.classroom);
    const home = parseVersion(data?.home);
    if (classroom && home) return { classroom, home };
  } catch {}
  throw new GenerationError("La respuesta del modelo no tuvo el formato esperado. Puedes intentarlo de nuevo.");
}

// this is the one network call in the app
export async function generateManual(profile: Profile): Promise<RailedManual> {
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
