import type { Descriptors } from "./profile";

export type Trigger = Partial<
  Pick<Descriptors, "span" | "orderHandling" | "negationHandling" | "startsEarly" | "asksForRepeats" | "pace">
>;

export interface Strategy {
  id: string;
  title: string;
  setting: "classroom" | "home" | "both";
  trigger: Trigger;
  rationale: string;
  script: string[];
  watchFor: string;
}

export interface ManualVersion {
  observed: string;
  toTry: string;
  watchFor: string;
}

export interface ManualSections {
  classroom: ManualVersion;
  home: ManualVersion;
}

export interface RailedManual {
  notices: string[];
  sections: ManualSections;
  closing: string;
}
