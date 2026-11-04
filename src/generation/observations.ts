import { suspicious } from "./context";

export const OBSERVATION_MAX = 200;

export const OBSERVATION_EXAMPLES = [
  "se rió mucho con las figuras",
  "me miraba la boca cuando le hablaba",
  "pidió agua a la mitad de la actividad",
  "se movía mucho en la silla",
  "se frustró en una instrucción difícil",
  "tardaba en empezar a responder",
  "se distraía con los ruidos del pasillo",
  "se concentró y quiso seguir jugando",
];

export const cleanObservation = (text: string) => text.replace(/\d/g, "").replace(/\s+/g, " ").slice(0, OBSERVATION_MAX);

export const finalObservation = (text: string) => {
  const cleaned = cleanObservation(text).trim();
  return suspicious(cleaned) ? "" : cleaned;
};
