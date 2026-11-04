import { afterEach, describe, expect, it, vi } from "vitest";
import { FIXTURE_TYPICAL_WITH_SHORT_SPAN } from "../types/profile";
import { generateManual, parseSections } from "./generateManual";

const VALID = {
  classroom: { observed: "a", toTry: "b", watchFor: "c" },
  home: { observed: "d", toTry: "e", watchFor: "f" },
};

describe("parseSections", () => {
  it("parses a clean JSON response", () => {
    expect(parseSections(JSON.stringify(VALID))).toEqual(VALID);
  });

  it("parses JSON wrapped in a markdown fence with trailing prose", () => {
    const text = `Aquí tienes el manual:\n\`\`\`json\n${JSON.stringify(VALID)}\n\`\`\`\n¡Espero que ayude!`;
    expect(parseSections(text)).toEqual(VALID);
  });

  it("ignores a stray brace in commentary before the real object", () => {
    const text = `Nota: usa { con cuidado.\n${JSON.stringify(VALID)}`;
    expect(parseSections(text)).toEqual(VALID);
  });

  it("throws GenerationError when no valid object is found", () => {
    expect(() => parseSections("no hay json aquí")).toThrow();
  });
});

describe("generateManual", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("parses a model response and removes unsafe sentences without breaking the remaining text", async () => {
    const modelSections = {
      classroom: {
        observed:
          "Siguió las instrucciones de dos pasos. Obtuvo 88 puntos. Esta observación indica autismo. Esperó a escuchar toda la frase.",
        toTry: "Da una instrucción breve y espera a que la complete.",
        watchFor: "Completa los pasos en el orden indicado.",
      },
      home: {
        observed: "Siguió las instrucciones de dos pasos. Esperó a escuchar toda la frase.",
        toTry: "Divide la tarea en partes y haz una pausa.",
        watchFor: "Pide escuchar de nuevo cuando lo necesita.",
      },
    };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ text: JSON.stringify(modelSections) }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const manual = await generateManual(FIXTURE_TYPICAL_WITH_SHORT_SPAN);

    expect(manual.sections.classroom.observed).toBe(
      "Siguió las instrucciones de dos pasos. Esperó a escuchar toda la frase.",
    );
    expect(manual.sections.classroom.toTry).toBe(modelSections.classroom.toTry);
    expect(manual.sections.home.observed).toBe(modelSections.home.observed);
    expect(manual.sections.home.toTry).toBe(modelSections.home.toTry);
  });
});
