export interface Animal {
  id: string;
  name: string;
  article: "el" | "la";
  emoji: string;
}

export const ANIMALS: Animal[] = [
  { id: "dog", name: "perro", article: "el", emoji: "🐶" },
  { id: "cat", name: "gato", article: "el", emoji: "🐱" },
  { id: "lion", name: "león", article: "el", emoji: "🦁" },
  { id: "elephant", name: "elefante", article: "el", emoji: "🐘" },
  { id: "monkey", name: "mono", article: "el", emoji: "🐵" },
  { id: "giraffe", name: "jirafa", article: "la", emoji: "🦒" },
  { id: "rabbit", name: "conejo", article: "el", emoji: "🐰" },
  { id: "bear", name: "oso", article: "el", emoji: "🐻" },
  { id: "fox", name: "zorro", article: "el", emoji: "🦊" },
  { id: "turtle", name: "tortuga", article: "la", emoji: "🐢" },
  { id: "penguin", name: "pingüino", article: "el", emoji: "🐧" },
  { id: "cow", name: "vaca", article: "la", emoji: "🐮" },
];

export const MAX_FAVORITES = 2;
export const DEFAULT_ANIMALS = ANIMALS.slice(0, MAX_FAVORITES);

export function completeAnimalSet(favoriteIds: string[]): Animal[] {
  const favorites = [...new Set(favoriteIds)]
    .map((id) => ANIMALS.find((animal) => animal.id === id))
    .filter((animal): animal is Animal => animal !== undefined)
    .slice(0, MAX_FAVORITES);
  const selectedIds = new Set(favorites.map((animal) => animal.id));
  const remaining = DEFAULT_ANIMALS.filter((animal) => !selectedIds.has(animal.id));
  return [...favorites, ...remaining].slice(0, MAX_FAVORITES);
}
