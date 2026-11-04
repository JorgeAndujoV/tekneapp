import { DEFAULT_ANIMALS, type Animal } from "./animals";

export interface Card {
  id: string;
  name: string;
  emoji: string;
  color: string;
  colorName: string;
  animalId: string;
}

export const COLORS = [
  { id: "red", name: "rojo", feminine: "roja", value: "#D94F4F" },
  { id: "blue", name: "azul", feminine: "azul", value: "#3A6EA5" },
  { id: "yellow", name: "amarillo", feminine: "amarilla", value: "#E8B83A" },
] as const;

export type ColorId = (typeof COLORS)[number]["id"];

export function cardId(color: ColorId, animalSlot: 1 | 2): string {
  return `${color}-a${animalSlot}`;
}

export function cardName(animal: Animal, color: (typeof COLORS)[number]): string {
  return `${animal.name} ${animal.article === "la" ? color.feminine : color.name}`;
}

export function spokenCardName(animal: Animal, color: (typeof COLORS)[number]): string {
  const article = animal.article === "el" ? "al" : "a la";
  return `${article} ${cardName(animal, color)}`;
}

export function cardsForAnimals(animals: Animal[]): Card[] {
  if (animals.length !== 2 || animals[0].id === animals[1].id) {
    throw new Error("Animal cards require two different selected animals.");
  }

  return COLORS.flatMap((color) =>
    animals.map((animal, index) => ({
      id: cardId(color.id, (index + 1) as 1 | 2),
      name: cardName(animal, color),
      emoji: animal.emoji,
      color: color.value,
      colorName: color.name,
      animalId: animal.id,
    })),
  );
}

export const CARDS = cardsForAnimals(DEFAULT_ANIMALS);
