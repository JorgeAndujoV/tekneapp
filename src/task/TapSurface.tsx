import { useRef, useState } from "react";
import { cardsForAnimals } from "../data/cards";
import type { Animal } from "../data/animals";

interface Props {
  onTap: (cardId: string | null) => void;
  selectedIds: string[];
  animals: Animal[];
}

// the same brief press effect on every card, so it never hints at right or wrong
export default function TapSurface({ onTap, selectedIds, animals }: Props) {
  const [pressed, setPressed] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const cards = cardsForAnimals(animals);
  const selectionLabels = selectedIds
    .map((id, index) => {
      const card = cards.find((item) => item.id === id);
      return card ? `${index + 1}. ${card.name}` : null;
    })
    .filter((label): label is string => label !== null);

  function acknowledge(cardId: string) {
    window.clearTimeout(timer.current);
    setPressed(cardId);
    timer.current = window.setTimeout(() => setPressed(null), 160);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="grid min-h-0 flex-1 touch-manipulation select-none grid-cols-2 grid-rows-3 gap-4 p-4"
        onPointerDown={() => onTap(null)}
      >
        {cards.map((card) => {
          const selectionOrder = selectedIds.indexOf(card.id);
          const isSelected = selectionOrder !== -1;
          return (
            <button
              key={card.id}
              type="button"
              aria-label={`${card.name}${isSelected ? `, seleccionado en posición ${selectionOrder + 1}` : ""}`}
              aria-pressed={isSelected}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => {
                acknowledge(card.id);
                onTap(card.id);
              }}
              style={{ backgroundColor: card.color }}
              className={`relative flex min-h-[88px] min-w-[88px] flex-col items-center justify-center gap-1 rounded-3xl border-2 border-black/15 p-2 shadow-sm outline-none transition-transform duration-150 ${
                pressed === card.id ? "scale-90" : "scale-100"
              }`}
            >
              <span className="rounded-full bg-white/80 px-2 py-1 text-[clamp(2.5rem,10vw,4.5rem)] leading-none" aria-hidden="true">
                {card.emoji}
              </span>
              <span className="rounded-lg bg-white/85 px-2 py-0.5 text-sm font-bold text-ink">{card.name}</span>
              {isSelected && (
                <span className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white text-xl font-bold text-ink shadow">
                  {selectionOrder + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="min-h-8 px-5 pb-2 text-center" aria-live="polite">
        {selectionLabels.length > 0 ? (
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-muted">Tu orden</p>
            <ul className="mt-1 text-xl font-semibold text-ink">
              {selectionLabels.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-lg text-muted">Toca los animales y colores en el orden que escuchaste.</p>
        )}
      </div>
    </div>
  );
}
