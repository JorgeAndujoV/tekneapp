import { useState } from "react";
import { SEEDS, type Seed } from "../data/seeds";
import type { Intake } from "../types/profile";

// a code needs at least one digit, which keeps names out
const CODE_PATTERN = /^(?=.*\d)[A-Z0-9-]{3,12}$/;

const RED_FLAG_QUESTIONS = [
  "Perdió habilidades que ya tenía (por ejemplo, dejó de hablar o de hacer algo que antes hacía)",
  "Se hace daño a sí misma o a sí mismo",
  "Hay señales de que sufre maltrato",
];

interface Props {
  onBegin: (childCode: string, intake: Intake) => void;
  onDemo: (seed: Seed) => void;
}

export default function Start({ onBegin, onDemo }: Props) {
  const [code, setCode] = useState("");
  const [showDemos, setShowDemos] = useState(false);
  const [redFlags, setRedFlags] = useState(RED_FLAG_QUESTIONS.map(() => false));
  const [otherLanguage, setOtherLanguage] = useState(false);
  const valid = CODE_PATTERN.test(code);

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-8 px-6 py-10">
      <h1 className="text-3xl font-semibold leading-tight">Seguir instrucciones</h1>
      <p className="text-xl leading-relaxed">
        La niña o el niño escuchará instrucciones cortas y tocará figuras en la pantalla. Al final recibirás un manual
        de apoyo.
      </p>

      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) onBegin(code, { redFlag: redFlags.some(Boolean), homeLanguageNotSpanish: otherLanguage });
        }}
      >
        <label htmlFor="code" className="text-lg font-medium">
          Código
        </label>
        <input
          id="code"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ""))}
          maxLength={12}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="NL-1A-07"
          className="rounded-2xl border-2 border-line bg-white px-4 py-4 text-2xl tracking-wide outline-none focus:border-accent"
        />
        <p className="text-base text-muted">Usa un código corto con al menos un número. Nunca escribas el nombre.</p>
        <fieldset className="mt-4 flex flex-col gap-3">
          <legend className="mb-1 text-lg font-medium">Marca lo que aplique (es opcional)</legend>
          {RED_FLAG_QUESTIONS.map((question, i) => (
            <label key={question} className="flex items-start gap-3 text-lg">
              <input
                type="checkbox"
                className="mt-1 h-6 w-6 shrink-0"
                checked={redFlags[i]}
                onChange={(event) => setRedFlags(redFlags.map((value, j) => (j === i ? event.target.checked : value)))}
              />
              {question}
            </label>
          ))}
          <label className="flex items-start gap-3 text-lg">
            <input
              type="checkbox"
              className="mt-1 h-6 w-6 shrink-0"
              checked={otherLanguage}
              onChange={(event) => setOtherLanguage(event.target.checked)}
            />
            En casa se habla otro idioma, o está aprendiendo español
          </label>
        </fieldset>
        <button type="submit" disabled={!valid} className="btn-primary mt-2">
          Comenzar
        </button>
      </form>

      <div className="mt-auto flex flex-col items-start gap-3">
        {showDemos ? (
          SEEDS.map((seed) => (
            <button key={seed.id} type="button" className="btn-secondary w-full text-left" onClick={() => onDemo(seed)}>
              {seed.label}
            </button>
          ))
        ) : (
          <button type="button" className="text-base text-muted underline" onClick={() => setShowDemos(true)}>
            Ver demostración
          </button>
        )}
      </div>
    </main>
  );
}
