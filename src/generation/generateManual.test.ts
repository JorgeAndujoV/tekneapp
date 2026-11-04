import { describe, expect, it, vi } from "vitest";
import { generateManual, parseSections } from "./generateManual";
import { FIXTURE_TYPICAL_WITH_SHORT_SPAN, type Flag } from "../types/profile";

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
