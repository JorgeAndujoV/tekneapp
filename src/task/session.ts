import type { Session, TrialResult } from "../types/profile";

function newSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// lives only in memory: nothing here is saved or sent anywhere
export function startSession(childCode: string): Session {
  return Object.freeze({
    sessionId: newSessionId(),
    childCode,
    grade: 1,
    startedAt: new Date().toISOString(),
    vocabCheckPassed: false,
    results: Object.freeze([]) as unknown as TrialResult[],
  });
}

export function recordVocabCheck(session: Session, passed: boolean): Session {
  return Object.freeze({ ...session, vocabCheckPassed: passed });
}

export function appendResult(session: Session, result: TrialResult): Session {
  return Object.freeze({
    ...session,
    results: Object.freeze([...session.results, Object.freeze(result)]) as TrialResult[],
  });
}
