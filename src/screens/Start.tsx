import { useState } from "react";
import { SEEDS, type Seed } from "../data/seeds";

// a code needs at least one digit, which keeps names out
const CODE_PATTERN = /^(?=.*\d)[A-Z0-9-]{3,12}$/;

interface Props {
  onBegin: (childCode: string) => void;
  onDemo: (seed: Seed) => void;
}

export default function Start({ onBegin, onDemo }: Props) {
  const [code, setCode] = useState("");
  const [showDemos, setShowDemos] = useState(false);
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
          if (valid) onBegin(code);
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
