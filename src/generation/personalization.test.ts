import { afterEach, describe, expect, it, vi } from "vitest";
import { adaptedExamples, checkExampleLine, chosenStrategies, generateManual, parseReply } from "./generateManual";
import { candidatesFor, matchStrategies, selectStrategies, STRATEGIES } from "./matchStrategies";
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

const candidates = candidatesFor(FIXTURE_TYPICAL_WITH_SHORT_SPAN);

const reply = (classroom: { toTry: string; watchFor: string }, home = { toTry: "", watchFor: "" }) => ({
  classroom: { observed: "Siguió bien instrucciones de dos pasos.", ...classroom },
  home: { observed: "Siguió bien instrucciones de dos pasos.", ...home },
});

function stubModel(body: object) {
  const spy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ text: JSON.stringify(body) }), { status: 200 }));
  vi.stubGlobal("fetch", spy);
  return spy;
}

describe("generateManual with situations", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("offers the model every strategy that could serve the child, and nothing else", () => {
    const text = buildPrompt(view, candidates, { classroom: "recreo", home: "" }).map((m) => m.content).join("\n");
    candidates.forEach((s, i) => expect(text).toContain(`Estrategia ${String.fromCharCode(65 + i)}: ${s.title}`));
    const outside = STRATEGIES.filter((s) => !candidates.includes(s));
    for (const s of outside) expect(text).not.toContain(s.title);
  });

  it("uses the strategy the model prefers when it serves the child's pattern", async () => {
    const standard = matchStrategies(FIXTURE_TYPICAL_WITH_SHORT_SPAN);
    const other = candidates.find((s) => !standard.includes(s) && s.codes.includes("E1"))!;
    const letter = String.fromCharCode(65 + candidates.indexOf(other));
    stubModel(reply({ toTry: `${letter}: Antes de salir al recreo di: Guarda tu pelota.`, watchFor: letter }));

    const manual = await generateManual(FIXTURE_TYPICAL_WITH_SHORT_SPAN, { classroom: "salida al recreo", home: "" });

    expect(manual.strategies[0]).toBe(other);
    expect(manual.sections.classroom.toTry).toContain(`1. ${other.title}`);
    expect(manual.sections.classroom.toTry).toContain("Ejemplo adaptado a tu situación: Antes de salir al recreo di: Guarda tu pelota.");
    other.script.forEach((step, i) => expect(manual.sections.classroom.toTry).toContain(`Paso ${i + 1}: ${step}`));
    expect(manual.sections.home.toTry).not.toContain("adaptado");
  });

  it("still covers every pattern when the model picks too few strategies", async () => {
    stubModel(reply({ toTry: "", watchFor: "A" }));
    const manual = await generateManual(FIXTURE_TYPICAL_WITH_SHORT_SPAN, { classroom: "recreo", home: "" });
    const standard = matchStrategies(FIXTURE_TYPICAL_WITH_SHORT_SPAN);
    expect(manual.strategies.length).toBe(standard.length);
    expect(manual.strategies.some((s) => s.codes.includes("E1"))).toBe(true);
  });

  it("falls back to the standard strategies when the model names letters that do not exist", async () => {
    stubModel(reply({ toTry: "", watchFor: "Z, Y" }));
    const manual = await generateManual(FIXTURE_TYPICAL_WITH_SHORT_SPAN, { classroom: "recreo", home: "" });
    expect(manual.strategies).toEqual(matchStrategies(FIXTURE_TYPICAL_WITH_SHORT_SPAN));
  });

  it("drops adapted examples that name a condition and keeps the library text", async () => {
    stubModel(reply({ toTry: "A: Esto es para el autismo.", watchFor: "A" }));
    const manual = await generateManual(FIXTURE_TYPICAL_WITH_SHORT_SPAN, { classroom: "recreo", home: "" });
    expect(manual.sections.classroom.toTry).not.toContain("autismo");
    expect(manual.sections.classroom.toTry).not.toContain("adaptado");
  });

  it("sends the situation to the model and ignores the model's choice when there is no situation", async () => {
    const spy = stubModel(reply({ toTry: "", watchFor: "C" }));
    const manual = await generateManual(FIXTURE_TYPICAL_WITH_SHORT_SPAN);
    expect(manual.strategies).toEqual(matchStrategies(FIXTURE_TYPICAL_WITH_SHORT_SPAN));
    expect(JSON.parse(spy.mock.calls[0][1].body).messages[1].content).not.toContain("Estrategia A");
  });

  it("reads the chosen letters in order and ignores repeats", () => {
    expect(chosenStrategies("C, A, C", candidates)).toEqual([candidates[2], candidates[0]]);
    expect(chosenStrategies("", candidates)).toEqual([]);
  });

  it("parses the situation examples and the choice from the reply", () => {
    const text = JSON.stringify(reply({ toTry: "A: uno", watchFor: "A, B" }));
    const parsed = parseReply(text);
    expect(parsed.toTry.classroom).toBe("A: uno");
    expect(parsed.watchFor.classroom).toBe("A, B");
  });
});

describe("selecting strategies", () => {
  it("lets a preference decide among strategies for the same pattern, never the pattern itself", () => {
    const preferred = candidates.filter((s) => !s.codes.includes("E1"));
    const chosen = selectStrategies(FIXTURE_TYPICAL_WITH_SHORT_SPAN, preferred);
    expect(chosen.some((s) => s.codes.includes("E1"))).toBe(true);
  });
});

describe("example verdicts", () => {
  it("names the reason an example is dropped", () => {
    const reasons = [
      "Guarda tu pelota.",
      "Z: Guarda tu pelota.",
      `A: ${"palabra ".repeat(60)}`,
      "A: Di 3 pasos.",
      "A: Esto es para el autismo.",
    ].map((line) => {
      const verdict = checkExampleLine(line, candidates);
      return verdict.ok ? "ok" : verdict.reason;
    });
    expect(reasons).toEqual(["format", "unknown", "long", "digit", "rails"]);
    expect(checkExampleLine("A: Guarda tu pelota.", candidates).ok).toBe(true);
  });
});
