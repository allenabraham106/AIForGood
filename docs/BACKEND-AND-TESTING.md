# Backend Overview & How to Test on the Deployed Site

## What the backend looks like

You have **one** backend piece: a **Vercel serverless function**.

| Item | Details |
|------|---------|
| **Path** | `api/reflection-question.js` (in the repo root) |
| **URL on live site** | `https://your-site.vercel.app/api/reflection-question` |
| **Method** | `POST` only |
| **Request body** | JSON: `{ "promptContext": "string (scenario text)" }` |
| **Success response** | `200` + `{ "question": "Generated question text" }` |
| **Uses** | Google Gemini (`GEMINI_API_KEY` or `GOOGLE_API_KEY` in Vercel env) |

**Flow:** Demo sends scenario text → function calls Gemini → returns one short reflection question. If the key isn’t set or the call fails, the function returns 503/502 and the **frontend** falls back to the 4 hardcoded questions in `scenarios.js`.

There are no other API routes, no database, and no auth. The rest of the app is static/frontend.

---

## What’s done

| Piece | Status |
|-------|--------|
| **Reflection API** | ✅ `api/reflection-question.js` — Gemini, error handling, response parsing |
| **4 fallback questions** | ✅ In `src/pipeline/scenarios.js` — used when API fails or has no key |
| **Demo calls API** | ✅ Before each Play, demo POSTs to `/api/reflection-question`; on success uses returned question, else fallback |
| **Demo in build** | ✅ `prebuild` runs `copy-demo.js` → `public/demo/` → deployed as `/demo/` |
| **Link from main app** | ✅ Branch screen footer: “CareVoice audio demo” → `/demo/` |

---

## How to check locally if everything is working

### Option A — App + demo only (no API)

1. **Terminal:** `cd` to the project, then run:
   ```bash
   npm install
   npm run dev
   ```
2. **Browser:** Open **http://localhost:5173/**
   - You should see the Branch tree and the **“CareVoice audio demo”** button at the bottom (scroll if needed).
3. **Go to the demo:** Click the button or open **http://localhost:5173/demo/**
   - You should see the CareVoice demo (scenario list, Play lesson, Stop, Got it, Hear again).
4. **Test audio:** Pick a scenario → **Play lesson**
   - You should hear: dialogue → cultural tip → key phrase → **reflection question** (using the 4 hardcoded questions, because `/api/reflection-question` is not running).
5. **Hear again:** After the lesson finishes, click **Hear again** → only the reflection question should play.
6. **Got it:** Click **Got it** → the scenario should show as completed.

**Result:** If 2–6 work, the frontend and audio pipeline are fine. The reflection API is not running in this mode (expected).

---

### Option B — App + demo + reflection API (full stack)

1. **Env:** Ensure **`.env.local`** in the project root contains:
   ```env
   GEMINI_API_KEY=your_key_here
   ```
2. **Terminal:** Run Vercel’s dev server (so the API route runs locally):
   ```bash
   npm install
   npx vercel dev
   ```
   When prompted, keep the default settings. It will start a local server (often http://localhost:3000).
3. **Browser:** Open the URL it prints (e.g. **http://localhost:3000/**).
   - Check the main app, then go to **/demo/** (or click “CareVoice audio demo”).
4. **Test with API:** In the demo, click **Play lesson** on a scenario.
   - You should hear the full sequence; the reflection question can come from **Gemini** (if the API returns 200) or the hardcoded fallback (if the API fails).
5. **Confirm API:** Open DevTools (F12) → **Network** tab → play a scenario again.
   - Find the **POST** request to **`/api/reflection-question`**. Check:
     - **200** → API worked; the spoken reflection may be the generated one.
     - **503** → No API key or key not loaded; fallback is used.
     - **502** → Gemini error; fallback is used.

**Result:** If the main app, demo, audio, and (with key) the API request all behave as above, everything is working locally.

---

### Quick checklist (local)

| Check | How |
|-------|-----|
| Main app loads | Open http://localhost:5173 (or 3000 with `vercel dev`) |
| “CareVoice audio demo” visible | Scroll to bottom of Branch screen; green pill button |
| Demo page loads | Go to /demo/ |
| Audio plays (4 segments) | Play lesson → hear dialogue, tip, key phrase, reflection |
| Hear again | After lesson, click Hear again → only reflection plays |
| Got it | Click Got it → scenario shows completed |
| API (optional) | Use `vercel dev` + .env.local; in Network tab see POST /api/reflection-question 200 |

---

## Demo not showing on Vercel?

If the app works locally but the **demo** (or the full app) doesn’t show on the deployed site:

1. **Build must run the copy step**  
   The demo is only in the build if **`npm run build`** runs (it runs `copy-demo` then `vite build`).  
   In Vercel: **Project → Settings → General → Build & Development Settings**  
   - **Build Command:** set to **`npm run build`** (not `vite build`).  
   - **Output Directory:** `dist` (or leave default if it’s already `dist`).

2. **Redeploy**  
   After changing settings or pushing the fix: **Deployments → … on latest → Redeploy**.

3. **Open the demo**  
   Use **`https://YOUR-URL.vercel.app/demo/`** (trailing slash can matter). The main app is at `/`, the demo at `/demo/`.

The repo’s `vercel.json` sets `buildCommand` to `npm run build` so the copy step runs; if your project overrides the build command in the dashboard, it must be `npm run build`.

---

## How to test on the deployed site

Use your real Vercel URL (e.g. `https://aiforgood-six.vercel.app`).

### 1. Main app loads

- Open **`https://YOUR-URL.vercel.app/`**
- You should see the Branch tree (green theme, categories).
- At the bottom there should be a **“CareVoice audio demo”** link.

### 2. Demo page loads

- Click **“CareVoice audio demo”** or go to **`https://YOUR-URL.vercel.app/demo/`**
- You should see: “CareVoice”, “Role 3 Audio Pipeline Demo”, scenario cards on the left, “Play lesson” / “Stop” / “Got it” / “Hear again” on the right.
- If you get a 404 or the main app again, the demo wasn’t deployed (check that `prebuild` runs and `public/demo/` is in the build).

### 3. Audio plays (fallback questions)

- Pick any scenario.
- Click **“Play lesson”**.
- You should hear, in order: dialogue → cultural tip → key phrase (repeated) → **reflection question**.
- Then “Got it” and “Hear again” should become enabled.
- **This confirms:** pipeline works, Web Speech works, and at least the **hardcoded** reflection questions work (even if the API is off or failing).

### 4. “Hear again” replays only the reflection

- After a lesson finishes, click **“Hear again”**.
- Only the **reflection question** should be spoken again (not the full lesson).
- **This confirms:** `playReflectionOnly` and the button are wired correctly.

### 5. “Got it” marks complete

- After playing, click **“Got it”**.
- The scenario card should show “Completed” (or similar) and the completion chip should update.
- **This confirms:** demo completion state works (Person 2 can later replace with real `markComplete`).

### 6. Reflection API (Gemini) works

- Only check this if **`GEMINI_API_KEY`** is set in Vercel (Project → Settings → Environment Variables) and you’ve redeployed.
- Play the **same** scenario 2–3 times.
- If the **last line** (reflection question) is sometimes different from the 4 hardcoded ones, the API is being used.
- Alternatively: open DevTools (F12) → Network, filter by “reflection” or “api”, click Play. You should see a **POST to `/api/reflection-question`** with **200** and a JSON body `{ "question": "..." }`. If you see **503**, the key isn’t set or not loaded; if **502**, Gemini failed (check Vercel function logs).

### 7. Quick API check (optional)

- In browser or Postman:
  - URL: `https://YOUR-URL.vercel.app/api/reflection-question`
  - Method: **POST**
  - Headers: `Content-Type: application/json`
  - Body: `{ "promptContext": "Scenario: Greeting a resident. Context: First day. Dialogue: PSW says hello." }`
- With a valid key: **200** and `{ "question": "..." }`.
- Without key: **503** and `{ "error": "Reflection API not configured", ... }`.

---

## One-line summary

**Backend:** One serverless function at `/api/reflection-question` that calls Gemini and returns a reflection question; the demo uses it when possible and falls back to 4 hardcoded questions. **To verify on the deployed site:** open `/demo/`, run through one full lesson (Play → Hear again → Got it), then confirm in Network tab that the API is called and returns 200 when the key is set.
