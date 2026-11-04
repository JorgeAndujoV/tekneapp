import type { ErrorCode } from "./profile";

export type StrategyCode = ErrorCode | "F1";

export type Evidence = "direct" | "indirect" | "theoretical" | "none";

export interface Strategy {
  id: string;
  title: string;
  setting: "classroom" | "home" | "both";
  codes: StrategyCode[];
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
