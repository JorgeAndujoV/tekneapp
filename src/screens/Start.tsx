import { useState } from "react";
import { SEEDS, type Seed } from "../data/seeds";
import type { Intake } from "../types/profile";
import { CHILD_CODE_MAX_LENGTH, isValidChildCode, normalizeChildCode } from "../data/childCode";

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
  const [consent, setConsent] = useState(false);
  const valid = isValidChildCode(code);

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
          if (valid && consent) onBegin(code, { redFlag: redFlags.some(Boolean), homeLanguageNotSpanish: otherLanguage });
        }}
      >
        <section className="rounded-2xl border-2 border-line bg-white p-4 text-base leading-relaxed">
          <h2 className="mb-2 text-lg font-semibold">Antes de empezar: participación y datos</h2>
          <p>
            La participación es voluntaria. La niña o el niño puede parar en cualquier momento, sin consecuencias.
            Esta actividad no es una evaluación clínica ni da un diagnóstico.
          </p>
          <p className="mt-2">
            La sesión y el código se mantienen temporalmente en la memoria de esta página; no se guardan en una cuenta
            ni en una base de datos. Al recargar o cerrar la página se borran. El código aparecerá en el manual impreso.
          </p>
          <p className="mt-2">
            Para generar el manual, se envían a OpenRouter observaciones resumidas de la actividad, avisos de validez y
            estrategias. No se envían el código ni los toques individuales. OpenRouter procesa esa solicitud según sus
            propias condiciones; no ingreses nombres ni otros datos que identifiquen directamente a la niña o al niño.
          </p>
          <p className="mt-2">
            La app no conserva constancia de quién aceptó. Si la escuela necesita guardar un consentimiento, debe
            documentarlo por separado según sus procedimientos.
          </p>
        </section>

        <label className="flex items-start gap-3 rounded-xl py-2 text-base leading-relaxed">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-accent"
          />
          <span>
            Confirmo que soy madre, padre o tutor, o personal escolar autorizado con permiso previo de la familia; que
            expliqué la actividad de forma apropiada y que la niña o el niño acepta participar.
          </span>
        </label>

        <label htmlFor="code" className="text-lg font-medium">
          Código de sesión (no nombre)
        </label>
        <input
          id="code"
          value={code}
          onChange={(event) => setCode(normalizeChildCode(event.target.value))}
          maxLength={CHILD_CODE_MAX_LENGTH}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="ESC-3B-014"
          className="rounded-2xl border-2 border-line bg-white px-4 py-4 text-2xl tracking-wide outline-none focus:border-accent"
        />
        <p className="text-base text-muted">
          Usa un código de sesión de 3 a 32 letras o números, con guiones o guiones bajos y al menos un número. No uses
          nombre, iniciales, fecha de nacimiento ni una matrícula que identifique directamente. Si la escuela necesita
          relacionar el código con un alumno, conserva esa equivalencia por separado y con acceso restringido.
        </p>
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
        <button type="submit" disabled={!valid || !consent} className="btn-primary mt-2">
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
