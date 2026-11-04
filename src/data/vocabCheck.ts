import { DEFAULT_ANIMALS, type Animal } from "./animals";
import { cardId, COLORS, spokenCardName } from "./cards";
import { voiceCard, voicePhrase } from "./voice";

export interface VocabItem {
  id: string;
  text: string;
  expected: string[];
  audioClips: string[];
}

export function createVocabItems(animals: Animal[]): VocabItem[] {
  if (animals.length !== 2 || animals[0].id === animals[1].id) {
    throw new Error("The vocabulary check requires two different selected animals.");
  }
  const warmupColors = ["red", "yellow"] as const;
  return animals.map((animal, index) => {
    const color = COLORS.find((candidate) => candidate.id === warmupColors[index])!;
    const animalSlot = (index + 1) as 1 | 2;
    return {
      id: `v0${index + 1}`,
      text: `Toca ${spokenCardName(animal, color)}.`,
      expected: [cardId(color.id, animalSlot)],
      audioClips: [voicePhrase("toca", animal), ...voiceCard(animal, color)],
    };
  });
}

export const VOCAB_ITEMS = createVocabItems(DEFAULT_ANIMALS);
