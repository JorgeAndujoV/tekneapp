import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), "LLM_"));
  return { test: { include: ["bench/**/*.live.ts"], testTimeout: 3_600_000, hookTimeout: 60_000 } };
});
