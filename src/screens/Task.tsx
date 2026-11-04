import { useEffect, useRef, useState } from "react";
import type { Intake, Session, TrialResult } from "../types/profile";
import { VOCAB_ITEMS } from "../data/vocabCheck";
import { TRIALS } from "../data/trials";
import { classifySelection, classifyTrial } from "../scoring/computeProfile";
import { appendResult, markDistress, recordVocabCheck, startSession } from "../task/session";
import { playClip, stopClip } from "../task/audio";
import TapSurface from "../task/TapSurface";
import TrialRunner from "../task/TrialRunner";

const GAP_MS = 900;

const STEPS = [
  ...VOCAB_ITEMS.map((item) => ({ ...item, kind: "vocab" as const })),
  ...TRIALS.map((trial) => ({ ...trial, kind: "trial" as const })),
];

interface Props {
  childCode: string;
  intake: Intake;
  onFinish: (session: Session) => void;
}

// typed locally instead of relying on the DOM lib shipping Screen Wake Lock types
type WakeLockSentinelLike = { release: () => Promise<void> };
type NavigatorWithWakeLock = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
};

// keeps the screen on for the length of the task; browsers without the API just get nothing
function useWakeLock() {
  useEffect(() => {
    const wakeLock = (navigator as NavigatorWithWakeLock).wakeLock;
    if (!wakeLock) return;
    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;
    wakeLock
      .request("screen")
      .then((s) => {
        if (cancelled) s.release().catch(() => {});
        else sentinel = s;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      sentinel?.release().catch(() => {});
    };
  }, []);
}

// this connects the warm-up and the twelve trials to the trial runner, one after another
export default function Task({ childCode, intake, onFinish }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const session = useRef(startSession(childCode, intake));
  const vocabCorrect = useRef<boolean[]>([]);
  const gapTimer = useRef<number | undefined>(undefined);
  const done = useRef(false);

  useWakeLock();

  useEffect(() => {
    let cancelled = false;
    playClip("audio/ui/intro.mp3").then(() => {
      if (!cancelled) setRunning(true);
    });
    return () => {
      cancelled = true;
      window.clearTimeout(gapTimer.current);
      stopClip();
    };
  }, []);

  const step = STEPS[stepIndex];

  function handleDone(result: TrialResult) {
    if (step.kind === "vocab") {
      const outcome = result.finalSelection
        ? classifySelection(result.finalSelection, step.expected)
        : classifyTrial(result.taps, step.expected);
      vocabCorrect.current.push(outcome === "correct");
      if (vocabCorrect.current.length === VOCAB_ITEMS.length) {
        session.current = recordVocabCheck(session.current, vocabCorrect.current.every(Boolean));
      }
    } else {
      session.current = appendResult(session.current, result);
    }

    setRunning(false);
    if (stepIndex + 1 >= STEPS.length) {
      finish();
      return;
    }
    gapTimer.current = window.setTimeout(() => {
      setStepIndex(stepIndex + 1);
      setRunning(true);
    }, GAP_MS);
  }

  // reports whatever the session has recorded so far; the trial in progress, if any, is dropped
  function finish() {
    if (done.current) return;
    done.current = true;
    onFinish(session.current);
  }

  function endNow(distress = false) {
    window.clearTimeout(gapTimer.current);
    stopClip();
    if (distress) session.current = markDistress(session.current);
    finish();
  }

  const progress = (stepIndex + (running ? 0 : 1)) / STEPS.length;

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <div className="flex items-center gap-4 px-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-line" aria-hidden="true">
          <div className="h-full rounded-full bg-muted/60 transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <button type="button" onClick={() => endNow()} className="text-sm text-muted underline">
            Terminar ahora
          </button>
          <button type="button" onClick={() => endNow(true)} className="text-sm text-muted underline">
            Se molestó o no quiere seguir
          </button>
        </div>
      </div>
      {running ? (
        <TrialRunner
          key={step.id}
          id={step.id}
          audioFile={step.audioFile}
          expected={step.expected}
          isLast={stepIndex + 1 >= STEPS.length}
          onDone={handleDone}
        />
      ) : (
        <>
          <TapSurface onTap={() => {}} selectedIds={[]} />
          <div className="h-24 shrink-0 pb-[env(safe-area-inset-bottom)]" />
        </>
      )}
    </main>
  );
}
