import type { Descriptors, Profile, promptView } from "../types/profile";
import type { Strategy } from "../types/manual";

export type PromptView = ReturnType<typeof promptView>;

// a full Profile does not fit this type: its measures, codes and ids are ruled out by name
export type PromptOnly = PromptView & { [K in Exclude<keyof Profile, keyof PromptView>]?: never };

export interface ChatMessage {
  role: "system" | "user";
  content: string;
}

const SETTING_LABEL: Record<Strategy["setting"], string> = {
  classroom: "solo para el aula",
  home: "solo para la casa",
  both: "para el aula y la casa",
};

function describeInWords(d: Descriptors): string[] {
  const lines: string[] = [];

  if (d.span === "one") lines.push("Sigue bien instrucciones de un solo paso; cuando tienen más pasos, pierde partes.");
  if (d.span === "two") lines.push("Sigue bien instrucciones de dos pasos; cuando son tres pasos, suele perder alguno.");
  if (d.span === "threeOrMore") lines.push("Siguió bien instrucciones de hasta tres pasos.");
  if (d.span === "unknown") lines.push("No hubo suficiente información para describir cuántos pasos sigue.");

  if (d.orderHandling === "holds")
    lines.push("Cuando la instrucción decía los pasos en otro orden (con \"antes de\" o \"después de\"), en general los hizo en el orden correcto.");
  if (d.orderHandling === "struggles")
    lines.push("Cuando la instrucción decía los pasos en otro orden (con \"antes de\" o \"después de\"), le costó hacerlos en el orden correcto.");

  if (d.negationHandling === "holds") lines.push("Entendió instrucciones con \"no\" o con condiciones (\"si... si no\").");
  if (d.negationHandling === "struggles") lines.push("Le costaron las instrucciones con \"no\" o con condiciones (\"si... si no\").");

  lines.push(
    d.startsEarly
      ? "Con frecuencia empezó a responder antes de que terminara la instrucción."
      : "Esperó a que terminara la instrucción antes de empezar.",
  );

  if (d.asksForRepeats === "never") lines.push("No pidió escuchar la instrucción otra vez.");
  if (d.asksForRepeats === "sometimes") lines.push("A veces pidió escuchar la instrucción otra vez.");
  if (d.asksForRepeats === "often") lines.push("Pidió escuchar la instrucción otra vez con frecuencia.");

  if (d.pace === "quick") lines.push("Empezó a responder rápido.");
  if (d.pace === "measured") lines.push("Se tomó un momento antes de responder.");
  if (d.pace === "slow") lines.push("Tardó en empezar a responder.");

  return lines;
}

function strategyInWords(s: Strategy): string {
  return [
    `Estrategia: ${s.title} (${SETTING_LABEL[s.setting]})`,
    `En qué consiste: ${s.rationale}`,
    "Guion:",
    ...s.script.map((step) => `- ${step}`),
    `Señal de que funciona: ${s.watchFor}`,
  ].join("\n");
}

const SYSTEM = `Escribes manuales de apoyo breves para docentes y familias en México.

Reglas:
- Escribe en español sencillo, para una persona adulta sin formación clínica. Frases cortas, tono cálido y concreto.
- Usa solo las estrategias que se te dan. No agregues estrategias, actividades, consejos ni recursos nuevos.
- Nunca menciones, sugieras ni insinúes una condición, un trastorno o un diagnóstico.
- No escribas ninguna cifra: ni puntajes, ni porcentajes, ni niveles, ni edades equivalentes.
- Describe lo que hizo, nunca por qué lo hizo.
- No sabemos si es niña o niño: redacta sin marcar el género cuando puedas.
- No agregues avisos ni recomendaciones de acudir a profesionales; eso se añade aparte.

Formato de respuesta: solo un objeto JSON, sin texto antes ni después, con esta forma exacta:
{"classroom":{"observed":"...","toTry":"...","watchFor":"..."},"home":{"observed":"...","toTry":"...","watchFor":"..."}}

- "classroom" es la versión para la maestra o el maestro; "home" es la versión para la familia.
- "observed" (lo que observamos): entre dos y cuatro oraciones, basadas solo en las observaciones dadas.
- "toTry" (qué probar): cada estrategia que corresponda a ese entorno, en una línea que empiece con "- ", con su título y las palabras exactas que dice la persona adulta. Adapta los ejemplos al entorno sin cambiar la estrategia. Si una estrategia es solo para el otro entorno, omítela. Si no queda ninguna, escribe que por ahora no hay una estrategia específica para este entorno.
- "watchFor" (a qué estar atentos): las señales de que funciona, tomadas de las estrategias usadas, en dos o tres oraciones.`;

export function buildPrompt(view: PromptOnly, strategies: Strategy[]): ChatMessage[] {
  const cautions: string[] = [];
  if (view.reliability === "partial") cautions.push("La sesión fue más corta de lo previsto: describe lo observado con cautela.");
  if (view.flags.length > 0)
    cautions.push("Este resultado lleva un aviso de validez que se añade aparte: no lo menciones, pero no presentes las observaciones como seguras.");

  const user = [
    "Observaciones de una tarea breve en la que escuchó instrucciones y tocó figuras en una pantalla:",
    ...describeInWords(view.descriptors).map((line) => `- ${line}`),
    ...(cautions.length ? ["", ...cautions] : []),
    "",
    "Estrategias que puedes usar (solo estas):",
    "",
    strategies.map(strategyInWords).join("\n\n"),
  ].join("\n");

  // last line of defence for the main rule: no number ever reaches the model
  if (/\d/.test(SYSTEM + user)) throw new Error("buildPrompt: the prompt contains a digit");

  return [
    { role: "system", content: SYSTEM },
    { role: "user", content: user },
  ];
}
