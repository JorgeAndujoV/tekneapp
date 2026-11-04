import { useRef, useState } from "react";
import { CARDS } from "../data/cards";

interface Props {
  onTap: (cardId: string | null) => void;
  selectedIds: string[];
}

// the same brief press effect on every card, so it never hints at right or wrong
export default function TapSurface({ onTap, selectedIds }: Props) {
  const [pressed, setPressed] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const selectionLabels = selectedIds
    .map((id, index) => {
      const card = CARDS.find((item) => item.id === id);
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
        {CARDS.map((card) => {
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
              className={`relative flex min-h-[88px] min-w-[88px] items-center justify-center rounded-3xl p-2 outline-none transition-transform duration-150 ${
                pressed === card.id ? "scale-90" : "scale-100"
              }`}
            >
              <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden="true">
                {card.shape === "circle" ? (
                  <circle cx="50" cy="50" r="44" fill={card.color} stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" />
                ) : (
                  <rect x="8" y="8" width="84" height="84" rx="6" fill={card.color} stroke="rgba(0,0,0,0.18)" strokeWidth="1.5" />
                )}
              </svg>
              {isSelected && (
                <span className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-white [text-shadow:0_2px_5px_rgba(0,0,0,0.8)]">
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
          <p className="text-lg text-muted">Toca las figuras en el orden que escuchaste.</p>
        )}
      </div>
    </div>
  );
}
