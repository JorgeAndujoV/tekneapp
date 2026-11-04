import { useEffect, useRef, useState } from "react";
import type { Profile } from "../types/profile";
import type { ManualSections, ManualVersion, RailedManual, Strategy } from "../types/manual";
import { TRIALS } from "../data/trials";
import { applyRails } from "../generation/applyRails";
import { GenerationError, generateManual, strategiesFor } from "../generation/generateManual";
import type { Context } from "../generation/context";

type Version = "classroom" | "home";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; manual: RailedManual };

const VERSION_LABEL: Record<Version, string> = {
  classroom: "Para el aula",
  home: "Para la casa",
};

interface Props {
  profile: Profile;
  seedManual: ManualSections | null;
  situations: Context;
  onRestart: () => void;
}

export default function Manual({ profile, seedManual, situations, onRestart }: Props) {
  // a seeded demo renders its pre-written manual straight away, with no network call
  const [state, setState] = useState<State>(() =>
    seedManual ? { status: "ready", manual: applyRails(seedManual, profile.flags, strategiesFor(profile)) } : { status: "loading" },
  );
  const [version, setVersion] = useState<Version>("classroom");
  const attempt = useRef(0);

  function generate() {
    const current = ++attempt.current;
    setState({ status: "loading" });
    generateManual(profile, situations).then(
      (manual) => current === attempt.current && setState({ status: "ready", manual }),
      (error) =>
        current === attempt.current &&
        setState({
          status: "error",
          message: error instanceof GenerationError ? error.message : "No se pudo generar el manual.",
        }),
    );
  }

  useEffect(() => {
    if (!seedManual) generate();
    return () => {
      attempt.current++;
    };
  }, []);

  const date = new Date().toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  const isDemo = seedManual !== null;

  return (
    <main className="mx-auto max-w-2xl px-5 py-8 print:max-w-none print:p-0 print:text-[10.5pt]">
      <div className="mb-8 flex flex-col gap-5 print:hidden">
        <h1 className="text-3xl font-semibold">Manual de apoyo</h1>
        {state.status === "ready" && (
          <div className="flex flex-wrap gap-3">
            <div className="flex rounded-2xl border-2 border-line bg-white p-1" role="tablist">
              {(Object.keys(VERSION_LABEL) as Version[]).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={version === v}
                  onClick={() => setVersion(v)}
                  className={`min-h-12 rounded-xl px-5 text-lg font-medium ${
                    version === v ? "bg-accent text-white" : "text-ink"
                  }`}
                >
                  {VERSION_LABEL[v]}
                </button>
              ))}
            </div>
            <button type="button" className="btn-secondary" onClick={() => window.print()}>
              Imprimir
            </button>
          </div>
        )}
      </div>

      {state.status === "loading" && <p className="text-xl text-muted">Preparando el manual…</p>}

      {state.status === "error" && (
        <div className="flex flex-col gap-4 rounded-2xl border-2 border-red-300 bg-red-50 p-5">
          <p className="text-xl font-semibold">No se pudo generar el manual.</p>
          <p className="text-lg">{state.message}</p>
          <button type="button" className="btn-primary self-start" onClick={generate}>
            Intentar de nuevo
          </button>
        </div>
      )}

      {state.status === "ready" &&
        (Object.keys(VERSION_LABEL) as Version[]).map((v, i) => (
          <VersionPage
            key={v}
            label={VERSION_LABEL[v]}
            content={state.manual.sections[v]}
            notices={state.manual.notices}
            limits={state.manual.limits}
            evidence={state.manual.strategies}
            closing={state.manual.closing}
            childCode={profile.childCode}
            date={date}
            isDemo={isDemo}
            visible={version === v}
            breakAfter={i === 0}
          />
        ))}

      <details className="mt-10 text-lg print:hidden">
        <summary className="cursor-pointer font-medium">Instrucciones que escuchó</summary>
        <ol className="mt-3 list-decimal space-y-1 pl-6 text-muted">
          {TRIALS.map((trial) => (
            <li key={trial.id}>{trial.text}</li>
          ))}
        </ol>
      </details>

      <button type="button" className="btn-secondary mt-8 print:hidden" onClick={onRestart}>
        Nueva sesión
      </button>
    </main>
  );
}

interface PageProps {
  label: string;
  content: ManualVersion;
  notices: string[];
  limits: string;
  evidence: Strategy[];
  closing: string;
  childCode: string;
  date: string;
  isDemo: boolean;
  visible: boolean;
  breakAfter: boolean;
}

// each version prints as its own page, so the classroom and home copies can be handed out separately
function VersionPage({
  label,
  content,
  notices,
  limits,
  evidence,
  closing,
  childCode,
  date,
  isDemo,
  visible,
  breakAfter,
}: PageProps) {
  return (
    <article
      className={`flex-col gap-6 print:flex print:gap-4 ${visible ? "flex" : "hidden"} ${
        breakAfter ? "print:break-after-page" : ""
      }`}
    >
      <header className="border-b-2 border-line pb-3">
        <p className="text-sm uppercase tracking-wide text-muted">Manual de apoyo · {label}</p>
        <p className="text-base text-muted">
          Código {childCode} · {date}
        </p>
        {isDemo && (
          <p className="mt-1 text-base font-medium">Ejemplo de demostración: no corresponde a una niña o un niño real.</p>
        )}
      </header>

      {notices.map((notice) => (
        <p key={notice} className="rounded-2xl border-2 border-line bg-white p-4 text-lg leading-relaxed print:p-3 print:text-[10.5pt]">
          {notice}
        </p>
      ))}

      <Section title="Lo que observamos" text={content.observed} />
      <Section title="Qué probar" text={content.toTry} />
      <Section title="A qué estar atentos" text={content.watchFor} />
      <Section title="Lo que esta tarea no puede decir" text={limits} />

      {evidence.length > 0 && (
        <section className="text-base leading-relaxed print:text-[9.5pt] print:leading-snug">
          <h2 className="mb-2 text-xl font-semibold print:mb-1 print:text-[11pt]">Sobre las estrategias</h2>
          <ul className="list-disc space-y-1 pl-6">
            {evidence.map((strategy) => (
              <li key={strategy.id}>
                <span className="font-medium">{strategy.title}.</span> {strategy.evidenceNote} Fuente: {strategy.source}.
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="border-t-2 border-line pt-4 text-base leading-relaxed print:pt-3 print:text-[9.5pt]">
        {closing}
      </footer>
    </article>
  );
}

function Section({ title, text }: { title: string; text: string }) {
  return (
    <section>
      <h2 className="mb-2 text-2xl font-semibold print:mb-1 print:text-[13pt]">{title}</h2>
      <p className="whitespace-pre-line text-lg leading-relaxed print:text-[10.5pt] print:leading-snug">{text}</p>
    </section>
  );
}
