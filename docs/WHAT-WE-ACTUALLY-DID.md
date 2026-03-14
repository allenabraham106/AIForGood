# What We Actually Did (CareVoice — Person 3)

## Two different “audio” things in this repo

1. **Main app (Branch)** — React app at the root URL (`/`). Has a tree, lesson screens, and **simple** speech (e.g. one phrase at a time) in some screens. **Not** the full pipeline.
2. **CareVoice audio demo** — A **separate** page that has the **full** audio pipeline: 4 scenarios, Play lesson → dialogue → cultural tip → key phrase → reflection question, Gemini API, Hear again. This is the “audio component” we built for Person 3.

The **audio pipeline** (dialogue → narration → key phrase → reflection, with buttons) only exists on the **demo** page, not on the main app’s home or lesson screens.

---

## Where the demo lives and why it might “not work”

- **In the repo:** The demo is in **`demo/`**: `demo/index.html`, `demo/app.js`, `demo/styles.css`, plus **`src/pipeline/scenarios.js`** and **`src/pipeline/speechPipeline.js`** (loaded by that HTML).
- **Locally:** Run `npm run dev`, then open **`http://localhost:5173/demo/`** (or `.../demo/index.html`). The main app is at `http://localhost:5173/`.
- **On Vercel (deployed):** The Vite build only builds the **React** app. The **`demo/`** folder is **not** part of the default build output, so **the demo was not deployed**. If you open your Vercel URL you only get the main app; **`/demo`** often 404s or shows the wrong page, so the “audio component” (the pipeline) doesn’t work there.

So: **“Audio not working”** usually means either you’re on the **main app** (which doesn’t have the full pipeline) or you’re on the **deployed** site where the **demo page wasn’t included** in the build.

---

## What we actually built (Person 3)

### Person 3A — “The brain”
- **Backend:** `api/reflection-question.js` — receives the scenario text, calls **Gemini**, returns one short reflection question (max 10 words, beginner English, encouraging). If the API key isn’t set or the call fails, the app uses the 4 hardcoded questions in `scenarios.js`.
- **4 fallback questions** in `src/pipeline/scenarios.js` for when the API is missing or fails.
- **Demo:** Before playing a scenario, the demo calls the API and, on success, uses the returned question as the reflection; otherwise it uses the fallback.

### Person 3B — “The voice”
- **`src/pipeline/speechPipeline.js`:**  
  - `playScenario(scenario)` — speaks in order: dialogue → pause → cultural tip → pause → key phrase (×2) → pause → reflection question.  
  - `playReflectionOnly(scenario)` — speaks only the reflection (for “Hear again”).  
  - Uses the browser **Web Speech API** (no external TTS).
- **`demo/app.js` + `demo/index.html`:**  
  - Scenario list, **Play lesson**, **Stop**, **Got it**, **Hear again**.  
  - Play → (optional API call for reflection) → run full pipeline → at the end enable Got it and Hear again.  
  - Hear again → replay only the reflection question.

So the “audio component” is: **demo page** + **pipeline** + **reflection API**, not the main React app’s simple phrase playback.

---

## How to get the audio demo working

1. **Locally**  
   - `npm run dev`  
   - Open **`http://localhost:5173/demo/`**  
   - Click a scenario, then **Play lesson**. Audio should run (and use Gemini if `GEMINI_API_KEY` is in `.env.local` and you’re using a dev server that runs the API, e.g. `npx vercel dev`).

2. **On Vercel**  
   - The demo must be part of the build. We’ve added **`public/demo/`** so that the demo is copied into `dist/demo/` and deployed. After deploy, open **`https://your-site.vercel.app/demo/`** to use the audio pipeline.
   - Set **`GEMINI_API_KEY`** in the Vercel project’s Environment Variables so the reflection API works in production.

3. **Link from the main app (optional)**  
   - Add a link on the main app (e.g. from the home screen) to **`/demo/`** so users can reach the CareVoice audio demo from the main app.

---

## One-line summary

**We built the CareVoice audio pipeline (dialogue → tip → key phrase → reflection, with Gemini for the question and “Hear again”) in a separate demo page; it works locally at `/demo/` and will work on Vercel at `/demo/` once the demo is included in the build and the API key is set.**
