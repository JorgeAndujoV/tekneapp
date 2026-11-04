import { useEffect, useRef, useState } from "react";
import type { Tap, TrialResult } from "../types/profile";
import type { Animal } from "../data/animals";
import { playClips, stopClip } from "./audio";
import TapSurface from "./TapSurface";

const SILENCE_LIMIT_MS = 15_000;
const MAX_TAPS = 3;

interface Props {
  id: string;
  instruction: string;
  audioClips: string[];
  expected: string[];
  animals: Animal[];
  isLast: boolean;
  onDone: (result: TrialResult) => void;
}

// one instruction: speak it, open the response window when it ends, close on a full answer or 15 s of silence
export default function TrialRunner({ id, instruction, audioClips, expected, animals, isLast, onDone }: Props) {
  const [listening, setListening] = useState(true);
  const [canReplay, setCanReplay] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [audioError, setAudioError] = useState("");

  const raw = useRef<{ cardId: string | null; at: number }[]>([]);
  const selectedRef = useRef<string[]>([]);
  const selectedAt = useRef(new Map<string, number>());
  const answerChanges = useRef(0);
  const endedAt = useRef<number | null>(null);
  const isListening = useRef(true);
  const replayed = useRef(false);
  const finished = useRef(false);
  const silenceTimer = useRef<number | undefined>(undefined);
  const audioRun = useRef(0);

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
      selfCorrections: answerChanges.current,
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

  function startAudio() {
    const run = ++audioRun.current;
    setAudioError("");
    setCanReplay(false);
    setListening(true);
    isListening.current = true;
    playClips(audioClips).then(
      () => {
        if (run !== audioRun.current || finished.current) return;
        if (!replayed.current && endedAt.current === null) endedAt.current = performance.now();
        setCanReplay(true);
        stopListening();
      },
      (error: unknown) => {
        if (run !== audioRun.current || finished.current) return;
        isListening.current = false;
        setListening(false);
        setAudioError(error instanceof Error ? error.message : "No se pudo reproducir el audio personalizado.");
      },
    );
  }

  useEffect(() => {
    startAudio();
    return () => {
      audioRun.current++;
      window.clearTimeout(silenceTimer.current);
      stopClip();
    };
  }, [instruction, audioClips]);

  function handleTap(cardId: string | null) {
    if (finished.current) return;
    const at = performance.now();
    raw.current.push({ cardId, at });
    if (cardId === null) return;
    const next = [...selectedRef.current];
    if (next.includes(cardId)) {
      selectedAt.current.delete(cardId);
      answerChanges.current++;
      next.splice(next.indexOf(cardId), 1);
    } else {
      // when the answer is already full, a new card replaces the most recent pick instead of being ignored
      if (next.length >= Math.min(expected.length, MAX_TAPS)) {
        selectedAt.current.delete(next.pop()!);
        answerChanges.current++;
      }
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
    // hearing it again starts the answer from scratch, so the first try doesn't steer the second;
    // the first try stays in the raw taps and is not counted as self-corrections
    selectedRef.current = [];
    selectedAt.current.clear();
    setSelectedIds([]);
    isListening.current = true;
    setListening(true);
    startAudio();
  }

  return (
    <>
      <TapSurface onTap={handleTap} selectedIds={selectedIds} animals={animals} />
      <div className="flex h-28 shrink-0 items-center justify-center gap-3 px-4 pb-[env(safe-area-inset-bottom)]">
        {audioError ? (
          <div className="flex flex-col items-center gap-2 text-center" role="alert">
            <p className="text-sm text-muted">{audioError}</p>
            <button type="button" onClick={startAudio} className="btn-secondary">
              Reintentar audio
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={replay}
              disabled={!canReplay || listening}
              className={`min-h-14 rounded-full border-2 border-line bg-white px-6 py-4 text-xl font-medium text-ink ${
                canReplay && !listening ? "" : "invisible"
              }`}
            >
              Escuchar otra vez
            </button>
            <button
              type="button"
              onClick={finish}
              disabled={listening}
              className="btn-primary min-h-14 px-7 py-4 text-xl"
            >
              {isLast ? "Terminar" : "Siguiente"}
            </button>
          </>
        )}
      </div>
    </>
  );
}
