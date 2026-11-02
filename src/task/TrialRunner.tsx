import { useEffect, useRef, useState } from "react";
import type { Tap, TrialResult } from "../types/profile";
import { isResponseComplete } from "../scoring/computeProfile";
import { playClip, stopClip } from "./audio";
import TapSurface from "./TapSurface";

const SILENCE_LIMIT_MS = 15_000;

interface Props {
  id: string;
  audioFile: string;
  expected: string[];
  onDone: (result: TrialResult) => void;
}

// one instruction: play it, open the response window when it ends, close on a full answer or 15 s of silence
export default function TrialRunner({ id, audioFile, expected, onDone }: Props) {
  const [listening, setListening] = useState(true);
  const [canReplay, setCanReplay] = useState(false);

  const raw = useRef<{ cardId: string | null; at: number }[]>([]);
  const endedAt = useRef<number | null>(null);
  const isListening = useRef(true);
  const replayed = useRef(false);
  const finished = useRef(false);
  const silenceTimer = useRef<number | undefined>(undefined);

  // times are measured from the end of the first playback, so taps during the audio come out negative
  function taps(): Tap[] {
    const end = endedAt.current ?? performance.now();
    return raw.current.map(({ cardId, at }) => ({ cardId, t: Math.round(at - end) }));
  }

  function finish() {
    if (finished.current) return;
    finished.current = true;
    window.clearTimeout(silenceTimer.current);
    stopClip();
    const recorded = taps();
    onDone({
      trialId: id,
      taps: recorded,
      replayed: replayed.current,
      abandoned: !isResponseComplete(recorded, expected),
    });
  }

  function armSilenceTimer() {
    window.clearTimeout(silenceTimer.current);
    silenceTimer.current = window.setTimeout(finish, SILENCE_LIMIT_MS);
  }

  function stopListening() {
    isListening.current = false;
    setListening(false);
    armSilenceTimer();
  }

  useEffect(() => {
    let cancelled = false;
    playClip(audioFile).then(() => {
      if (cancelled || finished.current) return;
      endedAt.current = performance.now();
      setCanReplay(true);
      stopListening();
    });
    return () => {
      cancelled = true;
      window.clearTimeout(silenceTimer.current);
      stopClip();
    };
  }, []);

  function handleTap(cardId: string | null) {
    if (finished.current) return;
    raw.current.push({ cardId, at: performance.now() });
    if (endedAt.current === null) return;
    if (isResponseComplete(taps(), expected)) return finish();
    if (!isListening.current) armSilenceTimer();
  }

  function replay() {
    if (replayed.current || isListening.current || finished.current) return;
    replayed.current = true;
    setCanReplay(false);
    window.clearTimeout(silenceTimer.current);
    isListening.current = true;
    setListening(true);
    playClip(audioFile).then(() => {
      if (!finished.current) stopListening();
    });
  }

  return (
    <>
      <TapSurface onTap={handleTap} />
      <ReplayButton visible={canReplay && !listening} onPress={replay} />
    </>
  );
}

export function ReplayButton({ visible, onPress }: { visible: boolean; onPress?: () => void }) {
  return (
    <div className="flex h-24 shrink-0 items-center justify-center pb-[env(safe-area-inset-bottom)]">
      <button
        type="button"
        onClick={onPress}
        disabled={!visible}
        className={`rounded-full border-2 border-line bg-white px-8 py-4 text-xl font-medium text-ink ${
          visible ? "" : "invisible"
        }`}
      >
        Escuchar otra vez
      </button>
    </div>
  );
}
