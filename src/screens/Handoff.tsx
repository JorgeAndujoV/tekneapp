export default function Handoff({ onBegin }: { onBegin: () => void }) {
  return (
    <main className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center gap-12 px-6 py-10 text-center">
      <p className="text-3xl font-semibold leading-snug">
        Entrega el dispositivo a la niña o al niño para que toque los animales y colores que escuche.
      </p>
      <button type="button" className="btn-primary w-full py-8 text-3xl" onClick={onBegin}>
        Empezar
      </button>
    </main>
  );
}
