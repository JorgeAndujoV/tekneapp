import type { Profile } from "../types/profile";
import type { Strategy, Trigger } from "../types/manual";
import library from "../data/strategies.json";

export const STRATEGIES = library.strategies as Strategy[];

function matches(trigger: Trigger, profile: Profile): boolean {
  return Object.entries(trigger).every(
    ([field, value]) => profile.descriptors[field as keyof Trigger] === value,
  );
}

// a session that is too short gets no strategies at all; the manual says so instead
export function matchStrategies(profile: Profile, strategies: Strategy[] = STRATEGIES): Strategy[] {
  if (profile.reliability === "insufficient") return [];
  return strategies
    .filter((strategy) => matches(strategy.trigger, profile))
    .map((strategy, order) => ({ strategy, order, score: Object.keys(strategy.trigger).length }))
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, 3)
    .map(({ strategy }) => strategy);
}
