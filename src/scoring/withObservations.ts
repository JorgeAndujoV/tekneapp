import type { Flag, Observations, Profile } from "../types/profile";

export function withObservations(profile: Profile, observations: Observations): Profile {
  const added: Flag[] = [];
  if (observations.watchesSpeaker) added.push("watches_speaker");
  if (observations.worseInClass) added.push("worse_in_class");

  const flags = [...new Set([...profile.flags.filter((flag) => flag !== "priority_referral"), ...added])];
  if (profile.flags.includes("priority_referral") || observations.watchesSpeaker) flags.push("priority_referral");

  return { ...profile, flags };
}
