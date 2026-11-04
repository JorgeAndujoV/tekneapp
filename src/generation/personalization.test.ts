import { afterEach, describe, expect, it, vi } from "vitest";
import { adaptedExamples, generateManual, parseReply } from "./generateManual";
import { matchStrategies, STRATEGIES } from "./matchStrategies";
import { buildPrompt } from "./buildPrompt";
import { cleanContext, CONTEXT_MAX, finalContext, hasContext, NO_CONTEXT } from "./context";
import { withStrategies } from "./strategyText";
import { FIXTURE_TYPICAL_WITH_SHORT_SPAN, promptView } from "../types/profile";

const strategies = matchStrategies(FIXTURE_TYPICAL_WITH_SHORT_SPAN);
const view = promptView(FIXTURE_TYPICAL_WITH_SHORT_SPAN);

describe("situation notes", () => {
  it("removes digits, extra spaces and anything past the limit", () => {
    expect(cleanContext("  salida   al recreo 2do  ")).toBe(" salida al recreo do ");
    expect(cleanContext("a".repeat(200))).toHaveLength(CONTEXT_MAX);
    expect(finalContext({ classroom: "  recreo 3 ", home: "" })).toEqual({ classroom: "recreo", home: "" });
    expect(hasContext(NO_CONTEXT)).toBe(false);
  });
});

describe("prompt with situations", () => {
  it("sends no strategies when there is no situation", () => {
    const text = buildPrompt(view, strategies, NO_CONTEXT).map((m) => m.content).join("\n");
    for (const s of strategies) expect(text).not.toContain(s.title);
  });

  it("sends the strategies, by letter, and the situation when there is one", () => {
    const text = buildPrompt(view, strategies, { classroom: "salida al recreo", home: "" }).map((m) => m.content).join("\n");
    expect(text).toContain("Aula: salida al recreo");
    expect(text).toContain("Casa: sin situación");
    expect(text).toContain(`Estrategia A: ${strategies[0].title}`);
    expect(text).not.toContain(strategies[0].id);
  });

  it("fits every strategy into a prompt without a digit", () => {
    for (const s of STRATEGIES) {
      expect(() => buildPrompt(view, [s], { classroom: "recreo", home: "cena" }), s.id).not.toThrow();
    }
  });
});

describe("adapted examples", () => {
  const first = strategies[0];

  it("keeps a clean one-line example for the strategy it names", () => {
    const found = adaptedExamples("A: Cuando salgan al recreo, di: Guarda tu pelota. Luego forma la fila.", strategies, true);
    expect(found[first.id]).toBe("Cuando salgan al recreo, di: Guarda tu pelota. Luego forma la fila.");
  });

  it.each([
    ["names a condition", "A: Esto sirve para el autismo."],
    ["has a digit", "A: Di dos veces 3 pasos."],
    ["is too long", `A: ${"palabra ".repeat(60)}`],
    ["names a letter with no strategy", "Z: Guarda tu pelota."],
    ["is not in the line format", "Guarda tu pelota."],
  ])("drops an example that %s", (_label, line) => {
    expect(adaptedExamples(line, strategies, true)).toEqual({});
  });

  it("ignores examples for a version with no situation", () => {
    expect(adaptedExamples("A: Guarda tu pelota.", strategies, false)).toEqual({});
  });

  it("shows the adapted example next to the library one", () => {
    const sections = withStrategies({ classroom: "a", home: "b" }, strategies, {
      classroom: { [first.id]: "Guarda tu pelota." },
      home: {},
    });
    expect(sections.classroom.toTry).toContain("Ejemplo adaptado a tu situación: Guarda tu pelota.");
    expect(sections.classroom.toTry).toContain(`Ejemplo base: ${first.example.classroom}`);
    expect(sections.home.toTry).toContain(`Ejemplo: ${first.example.home}`);
  });
});

describe("generateManual with situations", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("uses the model's adapted examples only where they are clean, and keeps the library steps", async () => {
    const reply = {
      classroom: {
        observed: "Siguió bien instrucciones de dos pasos.",
        toTry: "A: Antes de salir al recreo di: Guarda tu pelota.\nB: Esto es para el autismo.",
        watchFor: "",
      },
      home: { observed: "Siguió bien instrucciones de dos pasos.", toTry: "A: No debería usarse.", watchFor: "" },
    };
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ text: JSON.stringify(reply) }), { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);

    const manual = await generateManual(FIXTURE_TYPICAL_WITH_SHORT_SPAN, { classroom: "salida al recreo", home: "" });

    expect(manual.sections.classroom.toTry).toContain("Ejemplo adaptado a tu situación: Antes de salir al recreo di: Guarda tu pelota.");
    expect(manual.sections.classroom.toTry).not.toContain("autismo");
    strategies[0].script.forEach((step, i) => expect(manual.sections.classroom.toTry).toContain(`Paso ${i + 1}: ${step}`));
    expect(manual.sections.home.toTry).not.toContain("adaptado");
    expect(manual.sections.home.toTry).not.toContain("No debería usarse");
    expect(JSON.parse(fetchSpy.mock.calls[0][1].body).messages[1].content).toContain("Aula: salida al recreo");
  });

  it("parses the situation examples from the reply", () => {
    const text = JSON.stringify({
      classroom: { observed: "a", toTry: "A: uno", watchFor: "" },
      home: { observed: "b", toTry: "", watchFor: "" },
    });
    expect(parseReply(text).toTry).toEqual({ classroom: "A: uno", home: "" });
  });
});
