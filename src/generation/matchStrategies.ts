import type { Profile } from "../types/profile";
import type { Strategy, Trigger } from "../types/manual";
import library from "../data/strategies.json";

export const STRATEGIES = library.strategies as Strategy[];

function matches(trigger: Trigger, profile: Profile): boolean {
  return Object.entries(trigger).every(
    ([field, value]) => profile.descriptors[field as keyof Trigger] === value,
  );
}

const LIMIT = 3;

// the only descriptor fields that can take the value "struggles"
const STRUGGLE_FIELDS = ["orderHandling", "negationHandling"] as const;

interface Ranked {
  strategy: Strategy;
  order: number;
  score: number;
}

function rank(strategies: Strategy[], profile: Profile): Ranked[] {
  return strategies
    .filter((strategy) => matches(strategy.trigger, profile))
    .map((strategy, order) => ({ strategy, order, score: Object.keys(strategy.trigger).length }))
    .sort((a, b) => b.score - a.score || a.order - b.order);
}

// a session that is too short gets no strategies at all; the manual says so instead
export function matchStrategies(profile: Profile, strategies: Strategy[] = STRATEGIES): Strategy[] {
  if (profile.reliability === "insufficient") return [];

  const pool = rank(strategies, profile);

  // a dimension the profile struggles with must not lose its strategy just because other
  // matched strategies happen to have more trigger keys and so score higher by specificity
  const guaranteed: Ranked[] = [];
  for (const field of STRUGGLE_FIELDS) {
    if (profile.descriptors[field] !== "struggles") continue;
    const best = pool.find(
      (entry) => entry.strategy.trigger[field] === "struggles" && !guaranteed.includes(entry),
    );
    if (best) guaranteed.push(best);
  }

  const rest = pool.filter((entry) => !guaranteed.includes(entry));
  return [...guaranteed, ...rest].slice(0, LIMIT).map(({ strategy }) => strategy);
}
