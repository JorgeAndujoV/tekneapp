import type { ManualSections, Strategy } from "../types/manual";

type Setting = "classroom" | "home";

export type Examples = Record<Setting, Record<string, string>>;

export const NO_EXAMPLES: Examples = { classroom: {}, home: {} };

const HOW_LONG = "Prueba cada estrategia unos días seguidos antes de decidir si ayuda o pasar a otra.";

function exampleLines(strategy: Strategy, setting: Setting, adapted: string | undefined): string[] {
  return adapted
    ? [`Ejemplo adaptado a tu situación: ${adapted}`, `Ejemplo base: ${strategy.example[setting]}`]
    : [`Ejemplo: ${strategy.example[setting]}`];
}

function strategyBlock(strategy: Strategy, number: number, setting: Setting, examples: Examples): string {
  return [
    `${number}. ${strategy.title}`,
    `Cuándo usarla: ${strategy.whenToUse}`,
    "Pasos:",
    ...strategy.script.map((step, i) => `Paso ${i + 1}: ${step}`),
    ...exampleLines(strategy, setting, examples[setting][strategy.id]),
    `Si no funciona: ${strategy.ifItDoesNotWork}`,
    `Errores frecuentes: ${strategy.commonMistakes}`,
  ].join("\n");
}

export function withStrategies(
  observed: Record<Setting, string>,
  strategies: Strategy[],
  examples: Examples = NO_EXAMPLES,
): ManualSections {
  const version = (setting: Setting) => ({
    observed: observed[setting],
    toTry: [HOW_LONG, ...strategies.map((strategy, i) => strategyBlock(strategy, i + 1, setting, examples))].join("\n\n"),
    watchFor: strategies.map((strategy) => `- ${strategy.title}: ${strategy.watchFor}`).join("\n"),
  });
  return { classroom: version("classroom"), home: version("home") };
}
