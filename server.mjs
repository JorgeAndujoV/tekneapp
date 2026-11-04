import http from "node:http";
import { pathToFileURL } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

// a json-mode retry means up to two upstream calls, so each gets half the overall budget
const ATTEMPT_TIMEOUT_MS = 15_000;
const CLAUDE_TIMEOUT_MS = 50_000;
const MAX_BODY_BYTES = 64 * 1024;

// the shape buildPrompt asks for; with Claude, structured outputs guarantee it
const VERSION_SCHEMA = {
  type: "object",
  properties: { observed: { type: "string" }, toTry: { type: "string" }, watchFor: { type: "string" } },
  required: ["observed", "toTry", "watchFor"],
  additionalProperties: false,
};
const MANUAL_SCHEMA = {
  type: "object",
  properties: { classroom: VERSION_SCHEMA, home: VERSION_SCHEMA },
  required: ["classroom", "home"],
  additionalProperties: false,
};

function send(res, status, body) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("body too large"));
        req.destroy();
      } else {
        chunks.push(chunk);
      }
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function isValidMessages(messages) {
  return (
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.length <= 4 &&
    messages.every(
      (m) => (m?.role === "system" || m?.role === "user") && typeof m.content === "string",
    )
  );
}

// LLM_PROVIDER=anthropic talks to Claude through Anthropic's own SDK; anything else uses the OpenAI-compatible path
async function generateWithClaude(res, messages, apiKey, model) {
  // no silent retries: a failure goes straight back to the manual screen
  const client = new Anthropic({ apiKey, maxRetries: 0, timeout: CLAUDE_TIMEOUT_MS });
  // if a safety check declines the request, Anthropic re-runs it on its recommended fallback model
  const fallback = /^claude-(opus-5|fable-5|mythos-5)/.test(model)
    ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }
    : {};

  try {
    const response = await client.beta.messages.create({
      model,
      max_tokens: 16000,
      system: messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n"),
      messages: messages.filter((m) => m.role === "user").map((m) => ({ role: "user", content: m.content })),
      output_config: { format: { type: "json_schema", schema: MANUAL_SCHEMA } },
      ...fallback,
    });
    if (response.stop_reason === "refusal") {
      return send(res, 502, { error: "El modelo no generó este manual. Puedes intentarlo de nuevo." });
    }
    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
    if (!text.trim()) return send(res, 502, { error: "El modelo devolvió una respuesta vacía." });
    return send(res, 200, { text });
  } catch (err) {
    if (err instanceof Anthropic.APIConnectionTimeoutError) {
      return send(res, 504, { error: "El modelo tardó demasiado en responder." });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return send(res, 502, { error: "La clave de Anthropic no es válida. Revisa LLM_API_KEY en el archivo .env." });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return send(res, 502, { error: "Se alcanzó el límite de uso de Anthropic. Espera un momento e inténtalo de nuevo." });
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return send(res, 502, { error: "No se pudo conectar con Anthropic. Revisa la conexión a internet." });
    }
    if (err instanceof Anthropic.APIError) {
      console.error(`[generate] Anthropic answered ${err.status}: ${err.message}`);
      return send(res, 502, {
        error: `El servicio del modelo respondió con un error (${err.status}). Revisa el nombre del modelo o los créditos.`,
      });
    }
    console.error("[generate]", err);
    return send(res, 502, { error: "No se pudo obtener respuesta del modelo." });
  }
}

// the only place the API key is used; the browser never sees it
export async function handleGenerate(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Método no permitido." });

  const { LLM_PROVIDER, LLM_BASE_URL, LLM_API_KEY, LLM_MODEL } = process.env;
  const useClaude = LLM_PROVIDER === "anthropic";
  if (!LLM_API_KEY || !LLM_MODEL || (!useClaude && !LLM_BASE_URL)) {
    return send(res, 500, {
      error: "El servidor no tiene configurado el modelo. Revisa LLM_BASE_URL, LLM_API_KEY y LLM_MODEL en el archivo .env.",
    });
  }

  let messages;
  try {
    messages = JSON.parse(await readBody(req)).messages;
  } catch {
    return send(res, 400, { error: "La solicitud no es válida." });
  }
  if (!isValidMessages(messages)) return send(res, 400, { error: "La solicitud no es válida." });

  if (useClaude) return generateWithClaude(res, messages, LLM_API_KEY, LLM_MODEL);

  const endpoint = `${LLM_BASE_URL.replace(/\/+$/, "")}/chat/completions`;

  function callUpstream(withJsonMode) {
    const body = { model: LLM_MODEL, messages, temperature: 0.3 };
    if (withJsonMode) body.response_format = { type: "json_object" };
    return fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${LLM_API_KEY}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
    });
  }

  try {
    let upstream = await callUpstream(true);
    // a model/provider that rejects response_format doesn't always answer with a clean 400 —
    // e.g. Gemma via Google AI Studio instead fails with a 500 that OpenRouter forwards as 502 —
    // so retry once in plain-text mode on ANY failure of the json-mode attempt, not just a 400
    if (!upstream.ok) {
      console.error(`[generate] json-mode attempt failed (${upstream.status}), retrying without it`);
      upstream = await callUpstream(false);
    }
    if (!upstream.ok) {
      console.error(`[generate] model service answered ${upstream.status}: ${(await upstream.text()).slice(0, 500)}`);
      return send(res, 502, {
        error: `El servicio del modelo respondió con un error (${upstream.status}). Revisa la clave, el nombre del modelo o el límite de uso.`,
      });
    }
    const data = await upstream.json();
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) {
      return send(res, 502, { error: "El modelo devolvió una respuesta vacía." });
    }
    return send(res, 200, { text });
  } catch (err) {
    if (err?.name === "TimeoutError") {
      return send(res, 504, { error: "El modelo tardó demasiado en responder." });
    }
    console.error("[generate]", err);
    return send(res, 502, {
      error: "No se pudo obtener respuesta del servicio del modelo. Revisa la conexión a internet.",
    });
  }
}

// run on its own with `npm run server`; during development Vite mounts the same handler
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.loadEnvFile();
  } catch {}
  const port = Number(process.env.PORT ?? 8787);
  http
    .createServer((req, res) =>
      req.url === "/api/generate" ? handleGenerate(req, res) : send(res, 404, { error: "No encontrado." }),
    )
    .listen(port, () => console.log(`API lista en http://localhost:${port}/api/generate`));
}
