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

export function matchStrategies(profile: Profile, strategies: Strategy[] = STRATEGIES): Strategy[] {
  if (profile.reliability === "insufficient") return [];

  const targets = targetCodes(profile);
  if (targets.length === 0) return strategies.filter(isUniversal).slice(0, 1);

  const offset = variant(profile.sessionId);
  const chosen: Strategy[] = [];
  for (const code of targets) {
    if (chosen.length === LIMIT) break;
    if (chosen.some((strategy) => covers(strategy, code))) continue;
    const eligible = strategies.filter((strategy) => strategy.codes.includes(code) && !chosen.includes(strategy));
    const specific = eligible.filter((strategy) => !isUniversal(strategy));
    const options = specific.length > 0 ? specific : eligible;
    if (options.length > 0) chosen.push(options[offset % options.length]);
  }
  return chosen;
}
