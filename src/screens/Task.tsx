import { useEffect, useRef, useState } from "react";
import type { Session, TrialResult } from "../types/profile";
import { VOCAB_ITEMS } from "../data/vocabCheck";
import { TRIALS } from "../data/trials";
import { classifyTrial } from "../scoring/computeProfile";
import { appendResult, recordVocabCheck, startSession } from "../task/session";
import { playClip, stopClip } from "../task/audio";
import TapSurface from "../task/TapSurface";
import TrialRunner, { ReplayButton } from "../task/TrialRunner";

const GAP_MS = 900;

const STEPS = [
  ...VOCAB_ITEMS.map((item) => ({ ...item, kind: "vocab" as const })),
  ...TRIALS.map((trial) => ({ ...trial, kind: "trial" as const })),
];

interface Props {
  childCode: string;
  onFinish: (session: Session) => void;
}

// this connects the warm-up and the twelve trials to the trial runner, one after another
export default function Task({ childCode, onFinish }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const session = useRef(startSession(childCode));
  const vocabCorrect = useRef<boolean[]>([]);
  const gapTimer = useRef<number | undefined>(undefined);

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
      vocabCorrect.current.push(classifyTrial(result.taps, step.expected) === "correct");
      if (vocabCorrect.current.length === VOCAB_ITEMS.length) {
        session.current = recordVocabCheck(session.current, vocabCorrect.current.every(Boolean));
      }
    } else {
      session.current = appendResult(session.current, result);
    }

    setRunning(false);
    if (stepIndex + 1 >= STEPS.length) {
      onFinish(session.current);
      return;
    }
    gapTimer.current = window.setTimeout(() => {
      setStepIndex(stepIndex + 1);
      setRunning(true);
    }, GAP_MS);
  }

  const progress = (stepIndex + (running ? 0 : 1)) / STEPS.length;

  return (
    <main className="flex h-dvh flex-col overflow-hidden">
      <div className="px-6 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <div className="h-2 overflow-hidden rounded-full bg-line" aria-hidden="true">
          <div className="h-full rounded-full bg-muted/60 transition-[width] duration-500" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
      {running ? (
        <TrialRunner
          key={step.id}
          id={step.id}
          audioFile={step.audioFile}
          expected={step.expected}
          onDone={handleDone}
        />
      ) : (
        <>
          <TapSurface onTap={() => {}} />
          <ReplayButton visible={false} />
        </>
      )}
    </main>
  );
}
