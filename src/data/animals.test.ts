import { describe, expect, it } from "vitest";
import { ANIMALS, completeAnimalSet, DEFAULT_ANIMALS, MAX_FAVORITES } from "./animals";

describe("favorite animal cards", () => {
  it("uses exactly two different selected favorites in their chosen order", () => {
    const cards = completeAnimalSet(["giraffe", "fox"]);

    expect(cards.map((animal) => animal.id)).toEqual(["giraffe", "fox"]);
    expect(cards).toHaveLength(MAX_FAVORITES);
  });

  it("ignores unknown and duplicate ids and fills missing animals from the defaults", () => {
    const cards = completeAnimalSet(["cat", "not-an-animal", "cat"]);

    expect(cards.map((animal) => animal.id)).toEqual(["cat", DEFAULT_ANIMALS[0].id]);
    expect(ANIMALS).toContainEqual(cards[0]);
  });
});
