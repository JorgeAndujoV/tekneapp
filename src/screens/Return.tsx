import { useEffect, useState } from "react";
import { playClip, stopClip } from "../task/audio";
import { cleanObservation, OBSERVATION_EXAMPLES, OBSERVATION_MAX } from "../generation/observations";
import { suspicious } from "../generation/context";

export default function Return({ onContinue }: { onContinue: (observation: string) => void }) {
  const [text, setText] = useState("");

  useEffect(() => {
    playClip("audio/ui/done.mp3");
    return stopClip;
  }, []);

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-8 px-6 py-10">
      <p className="text-center text-3xl font-semibold leading-snug">Devuelve el dispositivo a la persona adulta.</p>

      <section className="flex flex-col gap-3 rounded-2xl border-2 border-line bg-white p-4">
        <h2 className="text-lg font-semibold">Lo que observaste (opcional)</h2>
        <p className="text-base text-muted">
          Escribe con tus palabras lo que notaste mientras hacía la actividad, aunque parezca poco importante. Se usará
          para personalizar el manual. Para generarlo, ese texto se envía al proveedor del modelo. No escribas nombres
          ni diagnósticos. Los números se quitan automáticamente.
        </p>
        <textarea
          value={text}
          onChange={(event) => setText(cleanObservation(event.target.value))}
          maxLength={OBSERVATION_MAX}
          rows={3}
          className="rounded-2xl border-2 border-line bg-white px-4 py-3 text-lg outline-none focus:border-accent"
        />
        {suspicious(text) && (
          <p className="text-base text-muted">
            Ese texto no se usará. Descríbelo con otras palabras, sin nombres, diagnósticos ni instrucciones.
          </p>
        )}
        <div className="text-base text-muted">
          <p>Algunos ejemplos de lo que podrías anotar:</p>
          <ul className="mt-1 list-disc space-y-1 pl-6">
            {OBSERVATION_EXAMPLES.map((example) => (
              <li key={example}>{example}</li>
            ))}
          </ul>
        </div>
      </section>

      <button type="button" className="btn-primary w-full" onClick={() => onContinue(text)}>
        Ver el manual
      </button>
    </main>
  );
}
