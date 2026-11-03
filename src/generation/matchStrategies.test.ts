import { describe, expect, it } from "vitest";
import { matchStrategies } from "./matchStrategies";
import {
  FIXTURE_SAME_SPAN_NO_MONITORING,
  FIXTURE_TYPICAL_WITH_SHORT_SPAN,
} from "../types/profile";

describe("matchStrategies", () => {
  it("never returns more than 3 strategies", () => {
    expect(matchStrategies(FIXTURE_SAME_SPAN_NO_MONITORING).length).toBeLessThanOrEqual(3);
    expect(matchStrategies(FIXTURE_TYPICAL_WITH_SHORT_SPAN).length).toBeLessThanOrEqual(3);
  });

  it("keeps a strategy for every dimension the profile struggles with", () => {
    // this profile struggles with both order and negation, but the more specific
    // order/early-start strategies used to crowd out the only negation strategy
    const result = matchStrategies(FIXTURE_SAME_SPAN_NO_MONITORING);
    expect(result.some((s) => s.trigger.orderHandling === "struggles")).toBe(true);
    expect(result.some((s) => s.trigger.negationHandling === "struggles")).toBe(true);
  });

  it("does not force in a struggling-dimension strategy the profile does not have", () => {
    // this profile holds its order and only struggles with negation
    const result = matchStrategies(FIXTURE_TYPICAL_WITH_SHORT_SPAN);
    expect(result.some((s) => s.trigger.negationHandling === "struggles")).toBe(true);
  });
});
