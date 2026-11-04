# tekneapp

A short listening task for first graders and a generator of practical support manuals for the adults around them (teachers and families in Mexico).

A child hears spoken instructions of growing length and taps coloured shapes. The app measures what happened, then writes a support manual in Spanish for the adult: a classroom version and a home version.

> **The strategy library (`src/data/strategies.json`) is unreviewed draft content.** It has not yet been reviewed by the clinical team and must not be used with families or schools until it has.

## How it is built

The app has two halves, and they stay separate:

- **Measurement** (`src/scoring/`): deterministic rules and arithmetic only. `computeProfile()` turns the recorded taps into a `Profile`.
- **Generation** (`src/generation/`): one call to a language model. The model receives only coarse labels from `promptView(profile)`, never a number. It receives these only after the task ends, and writes only for the adult.

`src/types/profile.ts` is the fixed contract between the two halves.

During each instruction, selected cards display their position in the answer order. Tapping a selected card removes it; tapping it again adds it at the end. The adult or child advances explicitly with **Siguiente** (or **Terminar** on the final item). The self-correction measure counts only explicit deselections, not guesses based on early and later taps.

After generation, `applyRails()` overrides whatever the model wrote. It strips scores, percentages and age equivalents, and removes any sentence that names a condition. If the result has a validity flag, it adds a notice at the top. It always appends the fixed closing, which says the manual is not a diagnosis and recommends a professional evaluation. That closing text is hard-coded and is never generated.

The session and child code stay in page memory; there is no app database, account, or persistent session storage. Reloading the page erases the session. The code appears on the printed manual, so use a non-identifying session code, not a name, initials, birth date, or directly identifying student number. If a school needs to map the code to a student, keep that mapping separately with restricted access. To generate a manual, the app sends summarized descriptors, validity flags, and selected strategies to the configured model provider (OpenRouter by default); it does not send the code or individual taps. The provider processes that request under its own terms. The start screen requires an adult confirmation of authorization and the child's willingness to participate, but the app does not retain proof of consent. Schools that need a formal record should collect it separately according to their procedures.

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
LLM_MODEL=google/gemma-4-31b-it:free
```

- **OpenRouter** (the default): create a key at openrouter.ai. The example uses Google's Gemma 4 31B free model, confirmed in OpenRouter's catalog on 2026-11-03. Free model availability and limits can change, so verify it again before a demo.
- **Gemini**: `LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai`, with a Gemini API key and a current Gemini model id.
- Any other OpenAI-compatible gateway works by changing the same variables.
- **Claude**: set `LLM_PROVIDER=anthropic`, put an Anthropic API key (console.anthropic.com) in `LLM_API_KEY` and `LLM_MODEL=claude-opus-5`. `LLM_BASE_URL` is ignored. This path uses Anthropic's own SDK, so the reply is guaranteed to have the manual's JSON shape. If a safety check declines a request, it is re-run on Anthropic's recommended fallback model.

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
