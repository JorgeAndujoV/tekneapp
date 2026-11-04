import type { Animal } from "./animals";
import type { COLORS } from "./cards";

type Color = (typeof COLORS)[number];
type Phrase =
  | "toca"
  | "luego"
  | "antes-de-tocar"
  | "despues-de-tocar"
  | "si-hay-verde-toca"
  | "si-no-toca"
  | "toca-la-tarjeta-del"
  | "toca-la-tarjeta-de-la"
  | "que-no-sea-azul-ni-amarilla";

const VOICE_DIRECTORY = "audio/voz";

export function voicePhrase(phrase: Phrase, animal?: Animal): string {
  if (phrase === "que-no-sea-azul-ni-amarilla") {
    return `${VOICE_DIRECTORY}/frases/${phrase}.mp3`;
  }
  if (phrase === "toca-la-tarjeta-del" || phrase === "toca-la-tarjeta-de-la") {
    return `${VOICE_DIRECTORY}/frases/${phrase}.mp3`;
  }
  if (!animal) throw new Error(`An animal is required for voice phrase "${phrase}".`);
  const article = animal.article === "el" ? "al" : "a-la";
  return `${VOICE_DIRECTORY}/frases/${phrase}-${article}.mp3`;
}

export function voiceAnimal(animal: Animal): string {
  const filename = animal.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return `${VOICE_DIRECTORY}/animales/${filename}.mp3`;
}

export function voiceCard(animal: Animal, color: Color): string[] {
  const colorName = animal.article === "la" ? color.feminine : color.name;
  return [
    voiceAnimal(animal),
    `${VOICE_DIRECTORY}/colores/${colorName}.mp3`,
  ];
}
