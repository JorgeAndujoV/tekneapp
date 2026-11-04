import { describe, expect, it } from "vitest";
import { applyRails } from "./applyRails";
import type { ManualSections } from "../types/manual";

function sections(observed: string): ManualSections {
  return {
    classroom: { observed, toTry: "sin cambios", watchFor: "sin cambios" },
    home: { observed, toTry: "sin cambios", watchFor: "sin cambios" },
  };
}

describe("applyRails — notices and closing", () => {
  it("puts the red-flag notice first and asks for priority attention", () => {
    const result = applyRails(sections("Texto."), ["red_flag", "vocab_check_failed", "priority_referral"]);
    expect(result.notices[0]).toContain("atención profesional pronto");
    expect(result.closing).toContain("Den prioridad");
  });

  it("adds a caution for a home language other than Spanish without asking for priority attention", () => {
    const result = applyRails(sections("Texto."), ["home_language"]);
    expect(result.notices).toHaveLength(1);
    expect(result.closing).not.toContain("Den prioridad");
  });
});

describe("applyRails — stripScores", () => {
  it("removes the whole sentence that carries a score, keeping the sentence next to it intact", () => {
    const result = applyRails(
      sections("Tiene una edad de 7 años. Le gusta compartir sus juguetes en el recreo."),
      [],
    );
    expect(result.sections.classroom.observed).not.toMatch(/\d/);
    expect(result.sections.classroom.observed).toContain("Le gusta compartir sus juguetes en el recreo.");
    expect(result.sections.classroom.observed).not.toContain("edad");
  });

  it("removes a sentence carrying a bare decimal score (0.67) as a whole sentence", () => {
    const result = applyRails(sections("Obtuvo 0.67 en la prueba. Siguió trabajando con calma."), []);
    expect(result.sections.classroom.observed).not.toContain("0.67");
    expect(result.sections.classroom.observed).toContain("Siguió trabajando con calma.");
  });

  it("still removes a sentence that names a blocked condition term (regression)", () => {
    const result = applyRails(
      sections("Esto no es autismo. Responde bien a instrucciones cortas."),
      [],
    );
    expect(result.sections.classroom.observed).not.toContain("autismo");
    expect(result.sections.classroom.observed).toContain("Responde bien a instrucciones cortas.");
  });
});

describe("applyRails — fixed manual text", () => {
  it("always includes the limits block and the intended-use statement", () => {
    const result = applyRails(sections("Texto."), []);
    expect(result.limits).toContain("audición");
    expect(result.closing).toContain("apoyo educativo");
  });

  it("removes sentences that use screening or risk words", () => {
    const result = applyRails(
      sections("Es un tamizaje de riesgo. Hace los pasos con calma. Sirve para la detección temprana."),
      [],
    );
    expect(result.sections.classroom.observed).toBe("Hace los pasos con calma.");
  });
});

describe("applyRails — blocked condition terms", () => {
  it.each([
    "Parece un trastorno del lenguaje.",
    "Podría ser TEA.",
    "Tiene dislexia.",
    "Muestra signos de discapacidad.",
    "Sufre de hipoacusia.",
    "Es un niño neurodivergente.",
    "Hay un retraso en su desarrollo.",
    "Parece ADHD.",
  ])("removes the sentence %s", (sentence) => {
    const result = applyRails(sections(`${sentence} Hace los pasos con calma.`), []);
    expect(result.sections.classroom.observed).toBe("Hace los pasos con calma.");
  });

  it("keeps ordinary words that contain a blocked acronym", () => {
    const text = "Fue al teatro y habló por teléfono con su tía.";
    expect(applyRails(sections(text), []).sections.classroom.observed).toBe(text);
  });
});
