
import { useState } from "react";
import { SEEDS, type Seed } from "../data/seeds";
import { ANIMALS, MAX_FAVORITES } from "../data/animals";
import type { Intake } from "../types/profile";
import { cleanContext, CONTEXT_MAX, finalContext, NO_CONTEXT, suspicious, type Context } from "../generation/context";
import { CHILD_CODE_MAX_LENGTH, isValidChildCode, normalizeChildCode } from "../data/childCode";

const RED_FLAG_QUESTIONS = [
  "Perdió habilidades que ya tenía (por ejemplo, dejó de hablar o de hacer algo que antes hacía)",
  "Se hace daño a sí misma o a sí mismo",
  "Hay señales de que sufre maltrato",
];

interface Props {
  onBegin: (childCode: string, intake: Intake, context: Context, favoriteIds: string[]) => void;
  onDemo: (seed: Seed) => void;
}

export default function Start({ onBegin, onDemo }: Props) {
  const [code, setCode] = useState("");
  const [showDemos, setShowDemos] = useState(false);
  const [redFlags, setRedFlags] = useState(RED_FLAG_QUESTIONS.map(() => false));
  const [otherLanguage, setOtherLanguage] = useState(false);
  const [consent, setConsent] = useState(false);
  const [privacyRead, setPrivacyRead] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [step, setStep] = useState(1);
  const [situations, setSituations] = useState<Context>(NO_CONTEXT);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const valid = isValidChildCode(code);

  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col gap-8 px-6 py-10">
      <h1 className="text-3xl font-semibold leading-tight">Seguir instrucciones</h1>
      <p className="text-xl leading-relaxed">
        La niña o el niño escuchará instrucciones cortas y tocará tarjetas de sus animales favoritos en distintos
        colores. Al final recibirás un manual de apoyo.
      </p>

      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid && consent && favoriteIds.length === MAX_FAVORITES)
            onBegin(
              code,
              { redFlag: redFlags.some(Boolean), homeLanguageNotSpanish: otherLanguage },
              finalContext(situations),
              favoriteIds,
            );
        }}
      >
        <details className="rounded-2xl border-2 border-line bg-white p-4 text-base leading-relaxed">
          <summary className="cursor-pointer font-semibold">Aviso de privacidad y participación</summary>
          <div className="mt-3">
            <p>
              La participación es voluntaria. La niña o el niño puede parar en cualquier momento, sin consecuencias.
              Esta actividad no es una evaluación clínica ni da un diagnóstico.
            </p>
            <p className="mt-2">
              La sesión y el código se mantienen temporalmente en esta página y se borran al recargarla o cerrarla. El
              código aparecerá en el manual impreso. La app no guarda constancia de quién aceptó.
            </p>
            <p className="mt-2">
              La selección de animales permanece en esta página. Las instrucciones se reproducen con grabaciones de
              voz incluidas en la app.
            </p>
            <p className="mt-2">
              Para generar el manual, se envían al proveedor del modelo de lenguaje observaciones resumidas de la
              actividad, avisos de validez y estrategias; no se envían el código ni los toques individuales. Las
              situaciones que escribas sobre la casa o el aula, y tus observaciones finales, también se envían al
              proveedor para personalizarlo. No incluyas nombres ni diagnósticos. Los números se quitan
              automáticamente. El proveedor procesa la solicitud según sus propias condiciones.
            </p>
            <p className="mt-2">
              Si la escuela necesita conservar un consentimiento, debe documentarlo por separado según sus
              procedimientos.
            </p>
          </div>
        </details>

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
        <fieldset className="mt-4">
          <legend className="mb-1 text-lg font-medium">Elige sus dos animales favoritos</legend>
          <div className="grid grid-cols-3 gap-2">
            {ANIMALS.map((animal) => {
              const selected = favoriteIds.includes(animal.id);
              const limitReached = favoriteIds.length === MAX_FAVORITES && !selected;
              return (
                <button
                  key={animal.id}
                  type="button"
                  aria-pressed={selected}
                  disabled={limitReached}
                  onClick={() =>
                    setFavoriteIds((current) =>
                      selected ? current.filter((id) => id !== animal.id) : [...current, animal.id],
                    )
                  }
                  className={`flex min-h-20 flex-col items-center justify-center rounded-2xl border-2 px-2 py-2 text-base font-medium disabled:opacity-40 ${
                    selected ? "border-accent bg-blue-50 text-ink" : "border-line bg-white text-ink"
                  }`}
                >
                  <span className="text-3xl" aria-hidden="true">{animal.emoji}</span>
                  {animal.name}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-sm text-muted" aria-live="polite">
            {favoriteIds.length} de {MAX_FAVORITES} animales elegidos
          </p>
        </fieldset>
        <fieldset className="mt-4 flex flex-col gap-3">
          <legend className="mb-1 text-lg font-medium">Para adaptar los ejemplos del manual (opcional)</legend>
          {(
            [
              ["classroom", "Una situación del aula en la que quieres ayudar", "salida al recreo, copiar del pizarrón"],
              ["home", "Una situación de la casa en la que quieres ayudar", "hora de la cena, arreglarse para dormir"],
            ] as const
          ).map(([field, label, example]) => (
            <label key={field} className="flex flex-col gap-1 text-lg">
              {label}
              <input
                value={situations[field]}
                onChange={(event) => setSituations({ ...situations, [field]: cleanContext(event.target.value) })}
                maxLength={CONTEXT_MAX}
                autoComplete="off"
                placeholder={example}
                className="rounded-2xl border-2 border-line bg-white px-4 py-3 text-lg outline-none focus:border-accent"
              />
              {suspicious(situations[field]) && (
                <span className="text-base text-muted">
                  Esa situación no se usará. Descríbela con otras palabras, sin nombres, diagnósticos ni instrucciones.
                </span>
              )}
            </label>
          ))}
        </fieldset>
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
        <button type="submit" disabled={!valid || !consent || favoriteIds.length !== MAX_FAVORITES} className="btn-primary mt-2">
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

      {showPrivacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-title"
            className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 text-base leading-relaxed shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 id="privacy-title" className="text-xl font-semibold">
                Privacidad y consentimiento
              </h2>
              <button
                type="button"
                aria-label="Cerrar aviso"
                className="text-2xl text-muted"
                onClick={() => setShowPrivacy(false)}
              >
                ×
              </button>
            </div>
            <h3 className="mb-2 text-lg font-semibold">Antes de empezar: participación y datos</h3>
            <p>
              La participación es voluntaria. La niña o el niño puede parar en cualquier momento, sin consecuencias.
              Esta actividad no es una evaluación clínica ni da un diagnóstico.
            </p>
            <p className="mt-2">
              La sesión y el código se mantienen temporalmente en la memoria de esta página; no se guardan en una cuenta
              ni en una base de datos. Al recargar o cerrar la página se borran. El código aparecerá en el manual impreso.
            </p>
            <p className="mt-2">
              Para generar el manual, se envían al proveedor del modelo de lenguaje observaciones resumidas de la
              actividad, avisos de validez y estrategias. No se envían el código ni los toques individuales. El
              proveedor procesa esa solicitud según sus propias condiciones; no ingreses nombres ni otros datos que
              identifiquen directamente a la niña o al niño.
            </p>
            <p className="mt-2">
              Si describes una situación del aula o de la casa, o escribes lo que observaste al terminar la actividad,
              esos textos también se envían al proveedor para personalizar el manual. No escribas nombres ni
              diagnósticos. Los números se quitan automáticamente.
            </p>
            <p className="mt-2">
              La app no conserva constancia de quién aceptó. Si la escuela necesita guardar un consentimiento, debe
              documentarlo por separado según sus procedimientos.
            </p>
            <button type="button" className="btn-secondary mt-6 w-full" onClick={() => setShowPrivacy(false)}>
              Cerrar aviso
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
