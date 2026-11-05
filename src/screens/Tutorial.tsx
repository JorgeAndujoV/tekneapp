import { useEffect, useState } from "react";
import type { Animal } from "../data/animals";
import { cardsForAnimals } from "../data/cards";
import { createAnimalTrials } from "../data/trials";
import { playClips, stopClip } from "../task/audio";
import TapSurface from "../task/TapSurface";
import handCursor from "../assets/hand-cursor.svg";

interface Props {
  animals: Animal[];
  onFinish?: () => void;
}

export default function Tutorial({ animals, onFinish }: Props) {
  const cards = cardsForAnimals(animals);
  const trials = createAnimalTrials(animals);
  const practice = [trials[0], trials[2]];
  const [step, setStep] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [playing, setPlaying] = useState(false);

  const current = practice[Math.max(0, step - 1)];
  const completed = step > practice.length;
  const targetId = step === 0 ? practice[0].expected[0] : current?.expected[selectedIds.length];
  const targetIndex = cards.findIndex((card) => card.id === targetId);

  useEffect(() => () => stopClip(), []);

  async function listen() {
    if (!current || playing) return;
    setPlaying(true);
    try {
      await playClips(current.audioClips);
    } catch {
      setMessage("No se pudo reproducir el audio. Lee la instrucción en pantalla.");
    } finally {
      setPlaying(false);
    }
  }

  function beginPractice() {
    setStep(1);
    setSelectedIds([]);
    setMessage("");
  }

  function handleTap(cardId: string | null) {
    if (!current || completed || cardId === null) return;
    const expectedId = current.expected[selectedIds.length];
    if (cardId !== expectedId) {
      setMessage("Inténtalo otra vez. Sigue la manita.");
      return;
    }
    const next = [...selectedIds, cardId];
    setSelectedIds(next);
    setMessage(next.length === current.expected.length ? "¡Muy bien! Lo lograste." : "¡Bien! Ahora toca la siguiente tarjeta.");
  }

  function advance() {
    stopClip();
    setSelectedIds([]);
    setMessage("");
    setStep((value) => value + 1);
  }

  if (completed) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="text-3xl font-semibold">¡Terminaste la práctica!</h1>
        <p className="text-xl">Ya sabes cómo escuchar y tocar las tarjetas en orden.</p>
        {onFinish && <button type="button" className="btn-primary" onClick={onFinish}>Comenzar actividad</button>}
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col gap-4 px-4 py-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold">Vamos a practicar</h1>
        <p className="mt-2 text-lg">
          {step === 0
            ? "Mira la manita. Te muestra dónde tocar."
            : "Escucha la instrucción y toca las tarjetas en orden."}
        </p>
        {step > 0 && <p className="mt-2 text-xl font-semibold">{current.text}</p>}
      </div>
      <div className="relative min-h-0 flex-1">
        {step === 0 ? (
          <div className="grid h-full grid-cols-2 grid-rows-3 gap-4">
            {cards.map((card) => (
              <div key={card.id} className="flex min-h-24 flex-col items-center justify-center gap-1 rounded-3xl border-2 border-black/15 p-2 shadow-sm" style={{ backgroundColor: card.color }}>
                <span className="rounded-full bg-white/80 px-2 py-1 text-5xl" aria-hidden="true">{card.emoji}</span>
                <span className="rounded-lg bg-white/85 px-2 py-0.5 text-sm font-bold text-ink">{card.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <TapSurface onTap={handleTap} selectedIds={selectedIds} animals={animals} />
        )}
        {targetIndex >= 0 && (
          <img
            src={handCursor}
            alt="Manita que indica la siguiente tarjeta"
            className="pointer-events-none absolute z-10 h-14 w-14 -translate-x-1/2 -translate-y-1/2 animate-bounce"
            style={{
              left: `${targetIndex % 2 === 0 ? 25 : 75}%`,
              top: `${(Math.floor(targetIndex / 2) + 0.5) * 100 / 3}%`,
            }}
          />
        )}
      </div>
      <div className="flex min-h-32 flex-col items-center justify-center gap-3 pb-[env(safe-area-inset-bottom)] text-center">
        {step === 0 ? (
          <button type="button" className="btn-primary" onClick={beginPractice}>Ahora me toca a mí</button>
        ) : (
          <>
            <p className="text-lg" aria-live="polite">{message || "Sigue la manita para elegir."}</p>
            <button type="button" className="btn-secondary" onClick={listen} disabled={playing}>
              {playing ? "Reproduciendo..." : "Escuchar instrucción"}
            </button>
            {selectedIds.length === current.expected.length && (
              <button type="button" className="btn-primary" onClick={advance}>
                {step === practice.length ? "Terminar práctica" : "Siguiente práctica"}
              </button>
            )}
          </>
        )}
      </div>
    </main>
  );
}
