import type { Descriptors, ErrorCode } from "./profile";

export type Trigger = Partial<
  Pick<Descriptors, "span" | "orderHandling" | "negationHandling" | "startsEarly" | "asksForRepeats" | "pace">
>;

export type Evidence = "direct" | "indirect" | "theoretical" | "none";

export interface Strategy {
  id: string;
  title: string;
  setting: "classroom" | "home" | "both";
  trigger: Trigger;
  codes: ErrorCode[];
  rationale: string;
  script: string[];
  watchFor: string;
  evidence: Evidence;
  evidenceNote: string;
  source: string;
  author: string | null;
  approvedOn: string | null;
  version: number;
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
