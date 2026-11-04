import { afterEach, describe, expect, it, vi } from "vitest";
import { buildObservationPrompt, cleanObservation, OBSERVATION_MAX, parseSuggestions, suggestObservations } from "./observations";
import { applyRails } from "./applyRails";
import { generateManual } from "./generateManual";
import { withObservations } from "../scoring/withObservations";
import { FIXTURE_TYPICAL_WITH_SHORT_SPAN, NO_OBSERVATIONS, REFERRAL_FIRST } from "../types/profile";

const reply = (ids: string) =>
  JSON.stringify({
    classroom: { observed: ids, toTry: "", watchFor: "" },
    home: { observed: "ninguna", toTry: "", watchFor: "" },
  });

describe("observation text", () => {
  it("removes digits and limits the length", () => {
    expect(cleanObservation("a las 10 de la mañana")).toBe("a las  de la mañana".replace("  ", " "));
    expect(cleanObservation("a".repeat(500))).toHaveLength(OBSERVATION_MAX);
  });

  it("builds a prompt without digits that lists only the fixed choices", () => {
    const text = buildObservationPrompt("me miraba la boca").map((m) => m.content).join("\n");
    expect(text).toContain("watches_speaker");
    expect(text).toContain("worse_in_class");
  });
});

describe("reading the model's suggestions", () => {
  it("accepts only the identifiers on the fixed list", () => {
    expect(parseSuggestions(reply("watches_speaker, worse_in_class"))).toEqual({ watchesSpeaker: true, worseInClass: true, restless: false });
    expect(parseSuggestions(reply("watches_speaker, esta_no_existe"))).toEqual({ watchesSpeaker: true, worseInClass: false, restless: false });
    expect(parseSuggestions(reply("ninguna"))).toEqual(NO_OBSERVATIONS);
  });

  it("makes no model call for an empty note", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    expect(await suggestObservations("   ")).toEqual(NO_OBSERVATIONS);
    expect(spy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("asks the model once and returns its suggestions", async () => {
    const spy = vi.fn().mockResolvedValue(new Response(JSON.stringify({ text: reply("watches_speaker") }), { status: 200 }));
    vi.stubGlobal("fetch", spy);
    expect(await suggestObservations("me miraba la boca")).toEqual({ watchesSpeaker: true, worseInClass: false, restless: false });
    expect(spy).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });
});

describe("what the confirmed boxes do", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("changes nothing when no box is ticked", () => {
    expect(withObservations(FIXTURE_TYPICAL_WITH_SHORT_SPAN, NO_OBSERVATIONS)).toEqual(FIXTURE_TYPICAL_WITH_SHORT_SPAN);
  });

  it("puts the hearing referral first when the child watched the speaker", async () => {
    const profile = withObservations(FIXTURE_TYPICAL_WITH_SHORT_SPAN, { watchesSpeaker: true, worseInClass: false, restless: false });
    expect(profile.flags).toEqual(["watches_speaker", "priority_referral"]);
    expect(REFERRAL_FIRST.some((flag) => profile.flags.includes(flag))).toBe(true);
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    const manual = await generateManual(profile);
    expect(spy).not.toHaveBeenCalled();
    expect(manual.strategies).toEqual([]);
    expect(manual.notices[0]).toContain("audición");
  });

  it("only adds a notice, and keeps the strategies, when responses are worse in class", () => {
    const profile = withObservations(FIXTURE_TYPICAL_WITH_SHORT_SPAN, { watchesSpeaker: false, worseInClass: true, restless: false });
    expect(profile.flags).toEqual(["worse_in_class"]);
    expect(REFERRAL_FIRST.some((flag) => profile.flags.includes(flag))).toBe(false);
    expect(applyRails({ classroom: { observed: "a", toTry: "b", watchFor: "c" }, home: { observed: "a", toTry: "b", watchFor: "c" } }, profile.flags).notices[0]).toContain("ruido");
  });

  it("keeps an earlier referral and does not repeat flags", () => {
    const base = { ...FIXTURE_TYPICAL_WITH_SHORT_SPAN, flags: ["replays_often", "priority_referral"] as const };
    const profile = withObservations({ ...base, flags: [...base.flags] }, { watchesSpeaker: true, worseInClass: true, restless: false });
    expect(profile.flags).toEqual(["replays_often", "watches_speaker", "worse_in_class", "priority_referral"]);
  });
});

describe("restlessness", () => {
  it("is read from the model's suggestions", () => {
    expect(parseSuggestions(reply("restless_session"))).toEqual({ watchesSpeaker: false, worseInClass: false, restless: true });
  });

  it("puts a specialist referral first, with its own notice", async () => {
    const profile = withObservations(FIXTURE_TYPICAL_WITH_SHORT_SPAN, { watchesSpeaker: false, worseInClass: false, restless: true });
    expect(profile.flags).toEqual(["restless_session", "priority_referral"]);
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    const manual = await generateManual(profile);
    vi.unstubAllGlobals();
    expect(spy).not.toHaveBeenCalled();
    expect(manual.strategies).toEqual([]);
    expect(manual.notices[0]).toContain("inquieta o inquieto");
  });
});
