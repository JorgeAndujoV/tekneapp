import { afterEach, describe, expect, it, vi } from "vitest";
import { FIXTURE_TYPICAL_WITH_SHORT_SPAN, type Flag } from "../types/profile";
import { generateManual, parseSections, strategiesFor } from "./generateManual";

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

describe("generateManual — referral first", () => {
  const withFlags = (flags: Flag[]) => ({ ...FIXTURE_TYPICAL_WITH_SHORT_SPAN, flags });

  it.each(["distress_stop", "vocab_check_failed", "baseline_failed", "most_failed", "replays_often", "many_no_response"] as Flag[])(
    "gives no strategies and makes no model call when %s is set",
    async (flag) => {
      const fetchSpy = vi.fn();
      vi.stubGlobal("fetch", fetchSpy);
      const manual = await generateManual(withFlags([flag, "priority_referral"]));
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(manual.sections.classroom.toTry).toContain("no proponemos estrategias");
      expect(manual.notices.length).toBeGreaterThan(0);
      vi.unstubAllGlobals();
    },
  );
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

describe("strategiesFor", () => {
  it("returns strategies for a normal profile and none when a referral comes first", () => {
    expect(strategiesFor(FIXTURE_TYPICAL_WITH_SHORT_SPAN).length).toBeGreaterThan(0);
    expect(strategiesFor({ ...FIXTURE_TYPICAL_WITH_SHORT_SPAN, flags: ["replays_often", "priority_referral"] })).toEqual([]);
  });
});
