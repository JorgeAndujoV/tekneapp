import { useEffect, useState } from "react";
import type { Observations } from "../types/profile";
import { NO_OBSERVATIONS } from "../types/profile";
import { playClip, stopClip } from "../task/audio";
import { GenerationError } from "../generation/generateManual";
import { cleanObservation, OBSERVATION_MAX, OBSERVATION_OPTIONS, suggestObservations } from "../generation/observations";

export default function Return({ onContinue }: { onContinue: (observations: Observations) => void }) {
  const [text, setText] = useState("");
  const [observations, setObservations] = useState<Observations>(NO_OBSERVATIONS);
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    playClip("audio/ui/done.mp3");
    return stopClip;
  }, []);

  function suggest() {
    setState("working");
    suggestObservations(text).then(
      (suggested) => {
        setObservations({
          watchesSpeaker: observations.watchesSpeaker || suggested.watchesSpeaker,
          worseInClass: observations.worseInClass || suggested.worseInClass,
          restless: observations.restless || suggested.restless,
        });
        setState("done");
      },
      (error) => {
        setMessage(error instanceof GenerationError ? error.message : "No se pudo revisar la observación.");
        setState("error");
      },
    );
  }

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-8 px-6 py-10">
      <p className="text-center text-3xl font-semibold leading-snug">Devuelve el dispositivo a la persona adulta.</p>

      <section className="flex flex-col gap-3 rounded-2xl border-2 border-line bg-white p-4">
        <h2 className="text-lg font-semibold">Lo que observaste (opcional)</h2>
        <p className="text-base text-muted">
          Escribe con tus palabras lo que notaste mientras hacía la actividad. Si pides sugerencias, ese texto se envía
          a OpenRouter. No escribas nombres ni diagnósticos. Los números se quitan automáticamente.
        </p>
        <textarea
          value={text}
          onChange={(event) => setText(cleanObservation(event.target.value))}
          maxLength={OBSERVATION_MAX}
          rows={3}
          className="rounded-2xl border-2 border-line bg-white px-4 py-3 text-lg outline-none focus:border-accent"
          placeholder="Por ejemplo: me miraba la boca cuando le hablaba"
        />
        <button type="button" className="btn-secondary" disabled={text.trim() === "" || state === "working"} onClick={suggest}>
          {state === "working" ? "Revisando…" : "Sugerir casillas"}
        </button>
        {state === "error" && <p className="text-base">{message} Puedes marcar las casillas tú misma o tú mismo.</p>}
        {state === "done" && <p className="text-base text-muted">Revisa las casillas: tú decides cuáles quedan marcadas.</p>}

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1 text-base font-medium">Casillas</legend>
          {OBSERVATION_OPTIONS.map((option) => (
            <label key={option.id} className="flex items-start gap-3 text-lg">
              <input
                type="checkbox"
                className="mt-1 h-6 w-6 shrink-0"
                checked={observations[option.field]}
                onChange={(event) => setObservations({ ...observations, [option.field]: event.target.checked })}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      </section>

      <button type="button" className="btn-primary w-full" onClick={() => onContinue(observations)}>
        Ver el manual
      </button>
    </main>
  );
}
