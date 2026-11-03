# tekneapp

A short listening task for first graders and a generator of practical support manuals for the adults around them (teachers and families in Mexico).

A child hears spoken instructions of growing length and taps coloured shapes. The app measures what happened, then writes a support manual in Spanish for the adult: a classroom version and a home version.

> **The strategy library (`src/data/strategies.json`) is unreviewed draft content.** It has not yet been reviewed by the clinical team and must not be used with families or schools until it has.

## How it is built

The app has two halves, and they stay separate:

- **Measurement** (`src/scoring/`): deterministic rules and arithmetic only. `computeProfile()` turns the recorded taps into a `Profile`.
- **Generation** (`src/generation/`): one call to a language model. The model receives only coarse labels from `promptView(profile)`, never a number. It receives these only after the task ends, and writes only for the adult.

`src/types/profile.ts` is the fixed contract between the two halves.

After generation, `applyRails()` overrides whatever the model wrote. It strips scores, percentages and age equivalents, and removes any sentence that names a condition. If the result has a validity flag, it adds a notice at the top. It always appends the fixed closing, which says the manual is not a diagnosis and recommends a professional evaluation. That closing text is hard-coded and is never generated.

Child data stays in memory. There is no database, storage, analytics or account. Reloading the page erases the session. Children are identified only by a short code that must contain a digit.

## Run it

Requires Node 20.12 or newer.

```sh
npm install
cp .env.example .env    # then fill in LLM_API_KEY
npm run dev             # http://localhost:5173
```

`npm run dev` starts Vite, and Vite serves `POST /api/generate` from `server.mjs` in the same process. The API key never reaches the browser. To try it on a phone on the same network, run `npm run dev -- --host` and open the address it prints.

Other scripts:

- `npm test` runs the scoring tests (Vitest).
- `npm run build` typechecks and builds to `dist/`. `npm run preview` serves the build together with the API.
- `npm run server` runs only the API on port 8787 (`PORT` changes it).

If the project lives inside WSL and you run Windows Node against `\\wsl.localhost\...`, Vite's file watcher prints `EISDIR` errors and hot reload does not work. The app still serves correctly. To get hot reload back, install Node inside WSL and run the commands there.

## Configure the model

`server.mjs` speaks the OpenAI-compatible chat completions format. The provider is set by three variables in `.env`:

```
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=your-key
LLM_MODEL=meta-llama/llama-3.3-70b-instruct:free
```

- **OpenRouter** (the default): create a key at openrouter.ai. Free models end in `:free`, and the list changes often, so check that the model in `.env.example` still exists before a demo.
- **Gemini**: `LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai`, with a Gemini API key and a current Gemini model id.
- Any other OpenAI-compatible gateway works by changing the same variables.

When the model call fails (wrong key, rate limit, no internet, a timeout after 30 s), the manual screen shows the reason and offers a manual retry. Nothing retries silently, and no text is generated in the browser.

## Demo without network

On the start screen, tap **Ver demostración** and pick one of the two examples. Each one carries a pre-written manual, so it renders with no network call at all. Use it as the fallback if the venue's wifi fails. Everything except the single generation call works offline.

## Real audio recordings

The app only plays files. It does no text-to-speech. The files in `public/audio/` are silent one-second placeholders. Replace them with real recordings at the same paths:

```
public/audio/vocab/v01.mp3 … v03.mp3     warm-up items (src/data/vocabCheck.ts)
public/audio/trials/t01.mp3 … t12.mp3    trials (text in src/data/trials.json)
public/audio/ui/intro.mp3                played before the warm-up
public/audio/ui/handoff.mp3              "give the device to the child"
public/audio/ui/done.mp3                 "give the device back to the adult"
```

Durations are never hard-coded. The response window opens when each file finishes playing, so recordings can be any length. Trim the silence at the end of each file: a child's response time is measured from the moment the file ends.

## Printing

**Imprimir** prints two pages: the classroom version on the first and the home version on the second. Each page carries its own validity notices and the closing, so the two can be handed out separately.
