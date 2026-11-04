import type { ManualSections, Strategy } from "../types/manual";

type Setting = "classroom" | "home";

const HOW_LONG = "Prueba cada estrategia unos días seguidos antes de decidir si ayuda o pasar a otra.";

function strategyBlock(strategy: Strategy, number: number, setting: Setting): string {
  return [
    `${number}. ${strategy.title}`,
    `Cuándo usarla: ${strategy.whenToUse}`,
    "Pasos:",
    ...strategy.script.map((step, i) => `Paso ${i + 1}: ${step}`),
    `Ejemplo: ${strategy.example[setting]}`,
    `Si no funciona: ${strategy.ifItDoesNotWork}`,
    `Errores frecuentes: ${strategy.commonMistakes}`,
  ].join("\n");
}

export function withStrategies(observed: Record<Setting, string>, strategies: Strategy[]): ManualSections {
  const version = (setting: Setting) => ({
    observed: observed[setting],
    toTry: [HOW_LONG, ...strategies.map((strategy, i) => strategyBlock(strategy, i + 1, setting))].join("\n\n"),
    watchFor: strategies.map((strategy) => `- ${strategy.title}: ${strategy.watchFor}`).join("\n"),
  });
  return { classroom: version("classroom"), home: version("home") };
}
