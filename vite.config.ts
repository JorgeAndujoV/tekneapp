import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { handleGenerate } from "./server.mjs";

// this runs the generation server inside the Vite process, so one command starts everything
function generateApi(): Plugin {
  return {
    name: "generate-api",
    configureServer(server) {
      server.middlewares.use("/api/generate", handleGenerate);
    },
    configurePreviewServer(server) {
      server.middlewares.use("/api/generate", handleGenerate);
    },
  };
}

export default defineConfig(({ mode }) => {
  // LLM_ variables stay on the server: Vite only exposes VITE_ variables to the browser
  Object.assign(process.env, loadEnv(mode, process.cwd(), "LLM_"));
  return { plugins: [react(), tailwindcss(), generateApi()] };
});
