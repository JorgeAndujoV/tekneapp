import { describe, expect, it } from "vitest";
import { completeAnimalSet } from "./animals";
import { createAnimalTrials } from "./trials";
import { cardsForAnimals } from "./cards";

describe("animal and color instructions", () => {
  const animals = completeAnimalSet(["lion", "giraffe"]);
  const trials = createAnimalTrials(animals);

  it("uses the chosen animal names in the spoken instructions", () => {
    expect(trials.find((trial) => trial.id === "t01")?.text).toBe("Toca al león rojo.");
    expect(trials.find((trial) => trial.id === "t03")?.audioClips).toEqual([
      "audio/voz/frases/toca-al.mp3",
      "audio/voz/animales/leon.mp3",
      "audio/voz/colores/azul.mp3",
      "audio/voz/frases/luego-a-la.mp3",
      "audio/voz/animales/jirafa.mp3",
      "audio/voz/colores/roja.mp3",
    ]);
    expect(trials.find((trial) => trial.id === "t03")?.text).toBe("Toca al león azul, luego a la jirafa roja.");
    expect(trials.every((trial) => /rojo|roja|azul|amarillo|amarilla/i.test(trial.text))).toBe(true);
    expect(cardsForAnimals(animals)).toHaveLength(6);
  });

  it("keeps reverse-order directions and the expected cards aligned", () => {
    expect(trials.find((trial) => trial.id === "t06")?.text).toBe("Antes de tocar al león rojo, toca a la jirafa azul.");
    expect(trials.find((trial) => trial.id === "t07")?.text).toBe("Toca al león amarillo después de tocar a la jirafa roja.");
    expect(trials.find((trial) => trial.id === "t06")?.audioClips.slice(0, 4)).toEqual([
      "audio/voz/frases/antes-de-tocar-al.mp3",
      "audio/voz/animales/leon.mp3",
      "audio/voz/colores/rojo.mp3",
      "audio/voz/frases/toca-a-la.mp3",
    ]);
    expect(trials.find((trial) => trial.id === "t07")?.audioClips.slice(0, 4)).toEqual([
      "audio/voz/frases/toca-al.mp3",
      "audio/voz/animales/leon.mp3",
      "audio/voz/colores/amarillo.mp3",
      "audio/voz/frases/despues-de-tocar-a-la.mp3",
    ]);
  });

  it("makes the negation and conditional instructions match the available board", () => {
    expect(trials.find((trial) => trial.id === "t11")?.text).toBe("Toca la tarjeta de la jirafa que no sea azul ni amarilla.");
    const conditional = trials.find((trial) => trial.id === "t12")!;
    expect(conditional.text).toBe("Si hay una tarjeta verde, toca a la jirafa roja. Si no, toca al león azul.");
  });
});
