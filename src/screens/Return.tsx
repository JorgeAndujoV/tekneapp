import { useEffect } from "react";
import { playClip, stopClip } from "../task/audio";

export default function Return({ onContinue }: { onContinue: () => void }) {
  useEffect(() => {
    playClip("audio/ui/done.mp3");
    return stopClip;
  }, []);

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-12 px-6 py-10 text-center">
      <p className="text-3xl font-semibold leading-snug">Devuelve el dispositivo a la persona adulta.</p>
      <div className="flex w-full flex-col gap-3">
        <p className="text-lg text-muted">Para la persona adulta:</p>
        <button type="button" className="btn-primary w-full" onClick={onContinue}>
          Ver el manual
        </button>
      </div>
    </main>
  );
}
