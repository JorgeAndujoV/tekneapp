import { useRef, useState } from "react";
import { CARDS } from "../data/cards";

interface Props {
  onTap: (cardId: string | null) => void;
}

// the same brief press effect on every card, so it never hints at right or wrong
export default function TapSurface({ onTap }: Props) {
  const [pressed, setPressed] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  function acknowledge(cardId: string) {
    window.clearTimeout(timer.current);
    setPressed(cardId);
    timer.current = window.setTimeout(() => setPressed(null), 160);
  }

  return (
    <div
      className="grid min-h-0 flex-1 touch-manipulation select-none grid-cols-2 grid-rows-3 gap-4 p-4"
      onPointerDown={() => onTap(null)}
    >
      {CARDS.map((card) => (
        <button
          key={card.id}
          type="button"
          aria-label={card.name}
          onPointerDown={(event) => {
            event.stopPropagation();
            acknowledge(card.id);
            onTap(card.id);
          }}
          className={`flex min-h-[88px] min-w-[88px] items-center justify-center rounded-3xl p-2 outline-none transition-transform duration-150 ${
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
        </button>
      ))}
    </div>
  );
}
