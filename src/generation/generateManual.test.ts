import { describe, expect, it } from "vitest";
import { parseSections } from "./generateManual";

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
