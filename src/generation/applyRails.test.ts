import { describe, expect, it } from "vitest";
import { applyRails } from "./applyRails";
import type { ManualSections } from "../types/manual";

function sections(observed: string): ManualSections {
  return {
    classroom: { observed, toTry: "sin cambios", watchFor: "sin cambios" },
    home: { observed, toTry: "sin cambios", watchFor: "sin cambios" },
  };
}

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
