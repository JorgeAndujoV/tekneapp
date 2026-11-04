# Tekneapp

A short listening task for first graders and a generator of practical support manuals for the adults around them (teachers and families in Mexico).

A child hears spoken instructions of growing length and taps coloured shapes. The app measures what happened, then writes a support manual in Spanish for the adult: a classroom version and a home version.

## Intended use

This app is educational support for the adults around a child (teachers and families). It describes what a child did in a short task and suggests supports. It is not for diagnosis, early detection or clinical decisions, and it does not replace a professional evaluation.

The task is informed by the Token Test tradition (spoken commands that ask a child to act on objects). It is not the Token Test, the Shortened Token Test, the Revised Token Test or any validated instrument. Their published norms do not apply to it, and the app reports no scores or age norms. Do not describe it as any of them.

## How it is built

The app has two halves, and they stay separate:

- **Measurement** (`src/scoring/`): deterministic rules and arithmetic only. `computeProfile()` turns the recorded taps into a `Profile`.
- **Generation** (`src/generation/`): one call to a language model. The model receives only coarse labels from `promptView(profile)`, never a number. It receives these only after the task ends, and writes only for the adult.

`src/types/profile.ts` is the fixed contract between the two halves.

### What the child does

During each instruction, selected cards display their position in the answer order. Tapping a selected card removes it; tapping it again adds it at the end. The adult or child advances explicitly with **Siguiente** (or **Terminar** on the final item). The self-correction measure counts only explicit deselections, not guesses based on early and later taps.

### What the measurement produces

Each answer gets zero or more observable codes. They describe what the child did, never why.

| E1 | Stops early: did the first steps right, then stopped
| E2 | Skips a step: did later steps but left one out
| E3 | Wrong order: the right cards in the wrong order (reversed "before/after" items are marked)
| E4 | Wrong object or attribute: at least one wrong card (colour, shape or both is recorded)
| E5 | Repeats the previous trial's answer
| E6 | Misses "no" or "if": any error on the negation and conditional items
| E7 | Starts before the end: selects while the audio is still playing
| E8 | No response

The profile tallies the codes and names a **dominant pattern**: the most frequent answer code (E1 to E6 and E8), needing at least two trials, with ties broken by severity (E8, E1, E2, E3, E4, E6, E5). E7 is counted separately and never becomes the dominant pattern.

**Action span** is the longest instruction length the child answered correctly on more than half of its trials. It is read only from the one-, two- and three-step trials.

The profile also records replays, and how many replayed trials ended correct.

### How strategies are chosen

`matchStrategies()` works from the codes:

1. A strategy for the dominant pattern comes first.
2. Then other patterns that recur in at least two trials, up to three strategies in total, with no repeats.
3. If the child asked for replays, the strategy for acknowledging requests for help is added when there is room.
4. A profile with no recurring pattern gets the all-purpose strategy ("a quiet place, facing the child").
5. Where several strategies serve the same pattern, the pick depends on the session, so different children get different strategies and the same session always gets the same ones.

A session too short to read (fewer than six answered trials) gets no strategies and fixed text.

### Referral first

When a result cannot be read at face value, the manual contains only fixed notices and no strategies, and the model is not called. This happens when:

- the child fails the warm-up vocabulary, or fails the simplest instructions;
- fewer than half the instructions are answered correctly;
- a replay is requested on more than half the trials;
- at least a third of the instructions get no response;
- the adult stops the session because the child is upset.

The notices name a hearing check, a language assessment or a specialist, as relevant.

Two inputs from the start screen work differently. A **red flag** (lost skills, self-harm, signs of abuse) puts a fixed notice at the top, and the manual still generates. A **home language other than Spanish** adds a caution only. Neither answer is sent to the model.

### Rails

After generation, `applyRails()` overrides whatever the model wrote. It strips scores, percentages and age equivalents, and removes any sentence that names a condition or uses screening or risk words (see `BLOCKED_TERMS` and `BLOCKED_ACRONYMS`). It then adds fixed text that the model never writes:

- the validity notices;
- a section, "Lo que esta tarea no puede decir", that says hearing, language, noise and memory cannot be told apart by this task, and when to check hearing;
- an evidence note and source for each strategy in the manual, taken from the library;
- the closing, which states the intended use and recommends, or gives priority to, a professional evaluation depending on the notices.

### Data and privacy

The session and child code stay in page memory; there is no app database, account, or persistent session storage. Reloading the page erases the session. The red-flag and home-language answers are held only in memory too.

The code appears on the printed manual, so use a non-identifying session code, not a name, initials, birth date, or directly identifying student number. If a school needs to map the code to a student, keep that mapping separately with restricted access. 

To generate a manual, the app sends summarized descriptors, validity flags, and selected strategies to the configured model provider (OpenRouter by default); it does not send the code or individual taps. The provider processes that request under its own terms. 

The start screen requires an adult confirmation of authorization and the child's willingness to participate, but the app does not retain proof of consent. Schools that need a formal record should collect it separately according to their procedures. Audio runs one way: the device speaks, and nothing is recorded from the child.

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

On the start screen, tap **Ver demostración** and pick one of the three examples. Each one carries a pre-written manual, so it renders with no network call at all. Use it as the fallback if the wifi fails.

- **Example A** shows a child who stops early on longer instructions and asks for replays.
- **Example B** shows a child who starts early and gets the order wrong.
- **Example C** shows the referral-first manual: no strategies, only fixed notices.

Everything except the single generation call works offline.

## Audio recordings

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

**Imprimir** prints two pages: the classroom version on the first and the home version on the second. Each page carries its own validity notices, the "what this task cannot tell you" section, the strategy evidence notes and the closing, so the two can be handed out separately. Check the print preview after changing any of this text, because the pages can overflow.
