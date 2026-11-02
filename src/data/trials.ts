import type { TrialSpec } from "../types/profile";
import trialsJson from "./trials.json";

// audioMs is required by the contract but never read: the response window opens on the audio's "ended" event
export type Trial = TrialSpec & { text: string };

export const TRIALS = trialsJson as Trial[];
