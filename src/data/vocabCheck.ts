export interface VocabItem {
  id: string;
  text: string;
  audioFile: string;
  expected: string[];
}

// warm-up items: they only check the child knows the words, and are never scored into the profile
export const VOCAB_ITEMS: VocabItem[] = [
  { id: "v01", text: "Toca el círculo rojo.", audioFile: "audio/vocab/v01.mp3", expected: ["r-c"] },
  { id: "v02", text: "Toca el cuadrado azul.", audioFile: "audio/vocab/v02.mp3", expected: ["b-s"] },
  { id: "v03", text: "Toca el círculo amarillo.", audioFile: "audio/vocab/v03.mp3", expected: ["y-c"] },
];
