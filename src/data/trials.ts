import type { TrialSpec } from "../types/profile";
import { DEFAULT_ANIMALS, type Animal } from "./animals";
import { COLORS, spokenCardName } from "./cards";
import { voiceAnimal, voiceCard, voicePhrase } from "./voice";
import trialsJson from "./trials.json";

export type Trial = TrialSpec & { text: string; audioClips: string[] };

const TEMPLATES = trialsJson as TrialSpec[];

interface Target {
  animal: Animal;
  color: (typeof COLORS)[number];
}

function targetFor(id: string, animals: Animal[], trialId: string): Target {
  const match = /^(red|blue|yellow)-a([12])$/.exec(id);
  const color = COLORS.find((candidate) => candidate.id === match?.[1]);
  const animal = animals[Number(match?.[2]) - 1];
  if (!color || !animal) throw new Error(`Unknown card in trial ${trialId}: ${id}`);
  return { animal, color };
}

function spokenTarget({ animal, color }: Target): string {
  return spokenCardName(animal, color);
}

function audioFor(trial: TrialSpec, animals: Animal[]): string[] {
  const targets = trial.expected.map((id) => targetFor(id, animals, trial.id));
  if (trial.id === "t06") {
    return [
      voicePhrase("antes-de-tocar", targets[1].animal),
      ...voiceCard(targets[1].animal, targets[1].color),
      voicePhrase("toca", targets[0].animal),
      ...voiceCard(targets[0].animal, targets[0].color),
    ];
  }
  if (trial.id === "t07") {
    return [
      voicePhrase("toca", targets[1].animal),
      ...voiceCard(targets[1].animal, targets[1].color),
      voicePhrase("despues-de-tocar", targets[0].animal),
      ...voiceCard(targets[0].animal, targets[0].color),
    ];
  }
  if (trial.id === "t11") {
    const animal = targets[0].animal;
    return [
      voicePhrase(animal.article === "el" ? "toca-la-tarjeta-del" : "toca-la-tarjeta-de-la"),
      voiceAnimal(animal),
      voicePhrase("que-no-sea-azul-ni-amarilla"),
    ];
  }
  if (trial.id === "t12") {
    const alternative = targetFor("red-a2", animals, trial.id);
    return [
      voicePhrase("si-hay-verde-toca", alternative.animal),
      ...voiceCard(alternative.animal, alternative.color),
      voicePhrase("si-no-toca", targets[0].animal),
      ...voiceCard(targets[0].animal, targets[0].color),
    ];
  }

  return targets.flatMap((target, index) => [
    voicePhrase(index === 0 ? "toca" : "luego", target.animal),
    ...voiceCard(target.animal, target.color),
  ]);
}

function instructionFor(trial: TrialSpec, animals: Animal[]): string {
  if (animals.length !== 2 || animals[0].id === animals[1].id) {
    throw new Error("Animal trials require two different selected animals.");
  }
  const targets = trial.expected.map((id) => targetFor(id, animals, trial.id));
  const labels = targets.map(spokenTarget);

  if (trial.id === "t06") return `Antes de tocar ${labels[1]}, toca ${labels[0]}.`;
  if (trial.id === "t07") return `Toca ${labels[1]} después de tocar ${labels[0]}.`;
  if (trial.id === "t11") {
    const animal = targets[0].animal;
    const reference = animal.article === "el" ? `del ${animal.name}` : `de la ${animal.name}`;
    return `Toca la tarjeta ${reference} que no sea azul ni amarilla.`;
  }
  if (trial.id === "t12") {
    const alternative = spokenTarget(targetFor("red-a2", animals, trial.id));
    return `Si hay una tarjeta verde, toca ${alternative}. Si no, toca ${labels[0]}.`;
  }

  return `Toca ${labels.join(", luego ")}.`;
}

export function createAnimalTrials(animals: Animal[]): Trial[] {
  return TEMPLATES.map((trial) => ({
    ...trial,
    text: instructionFor(trial, animals),
    audioClips: audioFor(trial, animals),
  }));
}

export const TRIALS = createAnimalTrials(DEFAULT_ANIMALS);
