import { useEffect, useRef, useState } from "react";
import type { Tap, TrialResult } from "../types/profile";
import { playClip, stopClip } from "./audio";
import TapSurface from "./TapSurface";

const SILENCE_LIMIT_MS = 15_000;
const MAX_TAPS = 3;

interface Props {
  id: string;
  audioFile: string;
  expected: string[];
  isLast: boolean;
  onDone: (result: TrialResult) => void;
}

// one instruction: play it, open the response window when it ends, close on a full answer or 15 s of silence
export default function TrialRunner({ id, audioFile, expected, isLast, onDone }: Props) {
  const [listening, setListening] = useState(true);
  const [canReplay, setCanReplay] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const raw = useRef<{ cardId: string | null; at: number }[]>([]);
  const selectedRef = useRef<string[]>([]);
  const selectedAt = useRef(new Map<string, number>());
  const deselections = useRef(0);
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
    const finalSelection: Tap[] = selectedRef.current.map((cardId) => ({
      cardId,
      t: Math.round((selectedAt.current.get(cardId) ?? performance.now()) - (endedAt.current ?? performance.now())),
    }));
    onDone({
      trialId: id,
      taps: recorded,
      finalSelection,
      selfCorrections: deselections.current,
      replayed: replayed.current,
      abandoned: finalSelection.length < expected.length,
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
    const at = performance.now();
    raw.current.push({ cardId, at });
    if (cardId === null) return;
    const next = [...selectedRef.current];
    if (next.includes(cardId)) {
      selectedAt.current.delete(cardId);
      deselections.current++;
      next.splice(next.indexOf(cardId), 1);
    } else {
      if (next.length >= Math.min(expected.length, MAX_TAPS)) return;
      selectedAt.current.set(cardId, at);
      next.push(cardId);
    }
    selectedRef.current = next;
    setSelectedIds(next);
    if (!isListening.current) armSilenceTimer();
  }

  // deliberately does not reset `endedAt`: a tap made while this replay is still playing is
  // still measured from the end of the FIRST playback, so it reads as a normal (positive)
  // response time and never gets flagged as a premature start — an unreviewed behaviour, not a chosen policy.
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
      <TapSurface onTap={handleTap} selectedIds={selectedIds} />
      <div className="flex h-24 shrink-0 items-center justify-center gap-3 px-4 pb-[env(safe-area-inset-bottom)]">
        <button
          type="button"
          onClick={replay}
          disabled={!canReplay || listening}
          className={`min-h-12 rounded-full border-2 border-line bg-white px-5 py-3 text-lg font-medium text-ink ${
            canReplay && !listening ? "" : "invisible"
          }`}
        >
          Escuchar otra vez
        </button>
        <button
          type="button"
          onClick={finish}
          disabled={listening}
          className="btn-primary min-h-12 px-6 py-3 text-lg"
        >
          {isLast ? "Terminar" : "Siguiente"}
        </button>
      </div>
    </>
  );
}
