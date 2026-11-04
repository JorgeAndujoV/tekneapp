import type { Profile } from "../types/profile";
import { DOMINANT_MIN_TRIALS, ERROR_CODES, SEVERITY } from "../types/profile";
import type { Strategy, StrategyCode } from "../types/manual";
import library from "../data/strategies.json";

export const STRATEGIES = library.strategies as Strategy[];

const LIMIT = 3;

function targetCodes(profile: Profile): StrategyCode[] {
  const { codeCounts, dominantCode } = profile.measures;
  const recurring = SEVERITY.filter((code) => code !== dominantCode && codeCounts[code] >= DOMINANT_MIN_TRIALS).sort(
    (a, b) => codeCounts[b] - codeCounts[a],
  );
  const targets: StrategyCode[] = [...(dominantCode ? [dominantCode] : []), ...recurring];
  if (profile.descriptors.startsEarly) targets.push("E7");
  if (profile.descriptors.asksForRepeats !== "never") targets.push("F1");
  return targets;
}

const isUniversal = (strategy: Strategy) => strategy.codes.length === ERROR_CODES.length;

const covers = (strategy: Strategy, code: StrategyCode) => !isUniversal(strategy) && strategy.codes.includes(code);

const variant = (sessionId: string) => [...sessionId].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);

function eligibleFor(code: StrategyCode, strategies: Strategy[], taken: Strategy[]): Strategy[] {
  const eligible = strategies.filter((strategy) => strategy.codes.includes(code) && !taken.includes(strategy));
  const specific = eligible.filter((strategy) => !isUniversal(strategy));
  return specific.length > 0 ? specific : eligible;
}

export function candidatesFor(profile: Profile, strategies: Strategy[] = STRATEGIES): Strategy[] {
  if (profile.reliability === "insufficient") return [];
  const targets = targetCodes(profile);
  if (targets.length === 0) return strategies.filter(isUniversal).slice(0, 1);
  const pool = targets.flatMap((code) => eligibleFor(code, strategies, []));
  return strategies.filter((strategy) => pool.includes(strategy));
}

export function selectStrategies(
  profile: Profile,
  preferred: Strategy[] = [],
  strategies: Strategy[] = STRATEGIES,
): Strategy[] {
  if (profile.reliability === "insufficient") return [];

  const targets = targetCodes(profile);
  if (targets.length === 0) return strategies.filter(isUniversal).slice(0, 1);

  const offset = variant(profile.sessionId);
  const chosen: Strategy[] = [];
  for (const code of targets) {
    if (chosen.length === LIMIT) break;
    if (chosen.some((strategy) => covers(strategy, code))) continue;
    const options = eligibleFor(code, strategies, chosen);
    const liked = options.find((strategy) => preferred.includes(strategy));
    const pick = liked ?? (options.length > 0 ? options[offset % options.length] : undefined);
    if (pick) chosen.push(pick);
  }
  return chosen;
}

export const matchStrategies = (profile: Profile, strategies: Strategy[] = STRATEGIES) =>
  selectStrategies(profile, [], strategies);
