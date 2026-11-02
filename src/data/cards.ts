export type Shape = "circle" | "square";

export interface Card {
  id: string;
  color: string;
  shape: Shape;
  name: string;
}

const RED = "#D94F4F";
const BLUE = "#3A6EA5";
const YELLOW = "#E8B83A";

export const CARDS: Card[] = [
  { id: "r-c", color: RED, shape: "circle", name: "círculo rojo" },
  { id: "r-s", color: RED, shape: "square", name: "cuadrado rojo" },
  { id: "b-c", color: BLUE, shape: "circle", name: "círculo azul" },
  { id: "b-s", color: BLUE, shape: "square", name: "cuadrado azul" },
  { id: "y-c", color: YELLOW, shape: "circle", name: "círculo amarillo" },
  { id: "y-s", color: YELLOW, shape: "square", name: "cuadrado amarillo" },
];
