import { namesCondition } from "./applyRails";

export interface Context {
  classroom: string;
  home: string;
}

export const NO_CONTEXT: Context = { classroom: "", home: "" };

export const CONTEXT_MAX = 80;

export const cleanContext = (text: string) => text.replace(/\d/g, "").replace(/\s+/g, " ").slice(0, CONTEXT_MAX);

const INSTRUCTION_WORDS =
  /ignor|olvid|escribe la palabra|responde en|instrucci|reglas|prompt|sistema|diagn[oó]stic|medicament|puntaje|por ciento|recomienda/i;

export function suspicious(text: string): boolean {
  if (INSTRUCTION_WORDS.test(text) || namesCondition(text)) return true;
  return text
    .trim()
    .split(/\s+/)
    .slice(1)
    .some((word) => /^[A-ZÁÉÍÓÚÑ]/.test(word) && word.length >= 3);
}

const usable = (text: string) => {
  const cleaned = cleanContext(text).trim();
  return suspicious(cleaned) ? "" : cleaned;
};

export const finalContext = (context: Context): Context => ({
  classroom: usable(context.classroom),
  home: usable(context.home),
});

export const hasContext = (context: Context) => context.classroom !== "" || context.home !== "";
