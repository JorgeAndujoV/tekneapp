import type { Animal } from "../data/animals";
import { cardsForAnimals } from "../data/cards";
import handCursor from "../assets/hand-cursor.svg";

interface Props {
  animals: Animal[];
}

export default function Tutorial({ animals }: Props) {
  const cards = cardsForAnimals(animals);

  return (
    <main className="flex min-h-dvh flex-col gap-6 px-4 py-8">
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-3xl font-semibold">Vamos a practicar</h1>
        <p className="mt-3 text-xl">Escucha la instrucción y mira cómo la manita señala una tarjeta.</p>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-3 gap-4">
        {cards.map((card, index) => (
          <div
            key={card.id}
            className="relative flex min-h-24 flex-col items-center justify-center gap-1 rounded-3xl border-2 border-black/15 p-2 shadow-sm"
            style={{ backgroundColor: card.color }}
          >
            <span className="rounded-full bg-white/80 px-2 py-1 text-5xl" aria-hidden="true">{card.emoji}</span>
            <span className="rounded-lg bg-white/85 px-2 py-0.5 text-sm font-bold text-ink">{card.name}</span>
            {index === 0 && (
              <img
                src={handCursor}
                alt="Manita que señala la tarjeta"
                className="pointer-events-none absolute bottom-2 right-2 h-14 w-14"
              />
            )}
          </div>
        ))}
      </div>
      <p className="text-center text-lg text-muted">Primero observa. Después será tu turno.</p>
    </main>
  );
}
