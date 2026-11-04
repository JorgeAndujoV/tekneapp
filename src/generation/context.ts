export interface Context {
  classroom: string;
  home: string;
}

export const NO_CONTEXT: Context = { classroom: "", home: "" };

export const CONTEXT_MAX = 80;

export const cleanContext = (text: string) => text.replace(/\d/g, "").replace(/\s+/g, " ").slice(0, CONTEXT_MAX);

export const finalContext = (context: Context): Context => ({
  classroom: cleanContext(context.classroom).trim(),
  home: cleanContext(context.home).trim(),
});

export const hasContext = (context: Context) => context.classroom !== "" || context.home !== "";
