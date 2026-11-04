import { afterEach, describe, expect, it, vi } from "vitest";
import { FIXTURE_TYPICAL_WITH_SHORT_SPAN, type Flag } from "../types/profile";
import { generateManual, parseReply, strategiesFor } from "./generateManual";

const VALID = {
  classroom: { observed: "a", toTry: "", watchFor: "" },
  home: { observed: "d", toTry: "", watchFor: "" },
};

const PARSED = {
  observed: { classroom: "a", home: "d" },
  toTry: { classroom: "", home: "" },
  watchFor: { classroom: "", home: "" },
};

describe("parseReply", () => {
  it("parses a clean JSON response", () => {
    expect(parseReply(JSON.stringify(VALID))).toEqual(PARSED);
  });

  it("parses JSON wrapped in a markdown fence with trailing prose", () => {
    const text = `Aquí tienes el manual:\n\`\`\`json\n${JSON.stringify(VALID)}\n\`\`\`\n¡Espero que ayude!`;
    expect(parseReply(text)).toEqual(PARSED);
  });

  it("ignores a stray brace in commentary before the real object", () => {
    const text = `Nota: usa { con cuidado.\n${JSON.stringify(VALID)}`;
    expect(parseReply(text)).toEqual(PARSED);
  });

  it("throws GenerationError when no valid object is found", () => {
    expect(() => parseReply("no hay json aquí")).toThrow();
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
        toTry: "",
        watchFor: "",
      },
      home: {
        observed: "Siguió las instrucciones de dos pasos. Esperó a escuchar toda la frase.",
        toTry: "",
        watchFor: "",
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
    expect(manual.sections.classroom.toTry).toContain("Paso 1:");
    expect(manual.sections.classroom.toTry).toContain(strategiesFor(FIXTURE_TYPICAL_WITH_SHORT_SPAN)[0].title);
    expect(manual.sections.home.observed).toBe(modelSections.home.observed);
    expect(manual.sections.home.toTry).toContain(strategiesFor(FIXTURE_TYPICAL_WITH_SHORT_SPAN)[0].example.home);
  });
});

describe("strategiesFor", () => {
  it("returns strategies for a normal profile and none when a referral comes first", () => {
    expect(strategiesFor(FIXTURE_TYPICAL_WITH_SHORT_SPAN).length).toBeGreaterThan(0);
    expect(strategiesFor({ ...FIXTURE_TYPICAL_WITH_SHORT_SPAN, flags: ["replays_often", "priority_referral"] })).toEqual([]);
  });
});
