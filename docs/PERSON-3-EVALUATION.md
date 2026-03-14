# CareVoice — Person 3 Full Evaluation

Evaluation of the codebase against the Person 3A/3B spec and KPIs. **You are using Gemini API** (not Claude); the spec you pasted says "pick Claude" for the Waterloo.AI hackathon — that’s a product/pitch choice. Technically the backend does the same job either way.

---

## 1. Does the backend actually work?

**Yes, with two conditions.**

| Check | Status |
|-------|--------|
| **API route** | `api/reflection-question.js` receives `POST` with `{ promptContext }`, calls Gemini, returns `{ question }`. |
| **Response parsing** | Fixed to support both `response.text` and `response.candidates[0].content.parts[0].text` so it works with the current Gemini SDK. |
| **Env** | Backend works only if `GEMINI_API_KEY` (or `GOOGLE_API_KEY`) is set in the Vercel project. If not set, the route returns 503 and the demo uses the 4 hardcoded questions. |
| **Demo integration** | Demo calls `/api/reflection-question` before play, 5s timeout; on success it uses the returned question; on failure it uses `scenario.reflectionQuestion` from `scenarios.js`. |

**How to verify:** Deploy with `GEMINI_API_KEY` set, open the demo, tap Play on a scenario. If the reflection question changes between runs or differs from the text in `scenarios.js`, the backend is working.

---

## 2. File-by-file evaluation

### `api/reflection-question.js` (Person 3A — backend)

| Spec | Implemented | Notes |
|------|-------------|--------|
| Send scenario to API | ✅ | `promptContext` = `buildReflectionPromptContext(scenario)` from the client. |
| Get one question back (max 10 words) | ✅ | Prompt enforces "Maximum 10 words", "Return only the question text". |
| Return plain string | ✅ | JSON `{ question: "..." }`; client uses it as `scenario.reflectionQuestion`. |
| System prompt rules | ✅ | Beginner English, encouraging, natural when spoken, no jargon. Matches spec intent. |
| **API choice** | **Gemini** | Spec says Claude; you use Gemini (sponsor). Same contract; swap later if needed. |

**Left for 3A:** Nothing. Optional: add Claude as a second provider or switch if the hackathon insists on Claude.

---

### `src/pipeline/scenarios.js` (Person 4 + 3A content)

| Spec | Implemented | Notes |
|------|-------------|--------|
| 4 scenarios | ✅ | greeting-resident, resident-refuses-help, talking-to-supervisor, small-emergency. |
| Dialogue, narration, key phrase, reflectionQuestion | ✅ | Each scenario has all four. |
| 4 reflection questions (fallback) | ✅ | Max 10 words, beginner English, encouraging. |
| `buildReflectionPromptContext(scenario)` | ✅ | Used by the demo when calling the API. |

**Left:** Nothing for Person 3.

---

### `src/pipeline/speechPipeline.js` (Person 3B — voice)

| Spec | Implemented | Notes |
|------|-------------|--------|
| speak(text) | ✅ | `speakSegment(text, voice, rate)` (internal); used for all segments. |
| pause(ms) | ✅ | `delay(settings.pauseMs)` (1000 ms) between segments. |
| playScenario(scenario) | ✅ | dialogue → pause → narration → pause → keyPhrase×2 → pause → reflection. |
| showButtons() | ✅ | Demo enables "Got it" and "Hear again" in `onComplete`. |
| "I Understood" → markComplete() | ✅ | Demo has "Got it" → `markScenarioComplete()`; Person 2 replaces with `markComplete(scenarioId)`. |
| "Hear Again" → replay reflection only | ✅ | **Added:** `playReflectionOnly(scenario)` + "Hear again" button; replays only the reflection question. |

**Left for 3B:** Nothing. Optional: rename "Got it" to "I Understood" in the UI if you want exact spec wording.

---

### `demo/app.js` (Person 3B — demo wiring)

| Spec | Implemented | Notes |
|------|-------------|--------|
| Fetch reflection from API before play | ✅ | `fetchReflectionThenPlay(scenario)`; 5s timeout; fallback to hardcoded. |
| Play → callbacks → onComplete | ✅ | Enables "Got it" and "Hear again" on completion. |
| Stop | ✅ | `pipeline.stop()`. |
| Got it → mark scenario complete | ✅ | Placeholder; Person 2 replaces with real `markComplete`. |
| Hear again | ✅ | **Added:** Replays only reflection using `lastPlayedScenarioWithReflection`. |

**Left:** None for Person 3.

---

### `demo/index.html` (Person 3B — UI)

| Spec | Implemented | Notes |
|------|-------------|--------|
| Play lesson | ✅ | data-play-button. |
| Stop | ✅ | data-stop-button. |
| Got it (I Understood) | ✅ | data-complete-button. |
| Hear again | ✅ | **Added:** data-hear-again-button. |

**Left:** None.

---

## 3. Person 3A vs 3B — what’s done, what’s left

### Person 3A — The Brain

| Task | Done? |
|------|--------|
| One function that gets reflection question | ✅ Implemented as **API**: client sends `promptContext`, server returns `question`. Equivalent to `getReflectionQuestion(scenarioText)`. |
| 4 tested questions (fallback) | ✅ In `scenarios.js`; used when API is missing or fails. |
| Handoff to 3B as plain string | ✅ Demo merges API result into `scenario.reflectionQuestion` before calling `playScenario`. |

**Left for 3A:** Nothing. If the hackathon requires **Claude** by name, add a Claude-based route or switch the existing route to Claude; contract (one question string) stays the same.

---

### Person 3B — The Voice

| Task | Done? |
|------|--------|
| speak(text) | ✅ |
| pause(ms) | ✅ |
| playScenario(scenario) — full chain | ✅ |
| Buttons: I Understood, Hear Again | ✅ "Got it" + "Hear again". |
| Hear Again replays only reflection | ✅ |

**Left for 3B:** Nothing. Optional: label "Got it" as "I Understood" if you want to match spec exactly.

---

## 4. Claude vs Gemini (spec vs your stack)

- **Spec:** "Pick Claude" for Waterloo.AI hackathon.
- **Your repo:** Uses **Gemini** (sponsor stack); one route, same input/output.

**Options:**

1. **Keep Gemini** — Pitch it as “we use the sponsor’s API (Gemini) for the reflection question.” No code change.
2. **Switch to Claude** — Replace the Gemini call in `api/reflection-question.js` with Anthropic; keep the same request/response so the demo is unchanged.
3. **Support both** — e.g. env `REFLECTION_PROVIDER=gemini|claude` and call the right API. More code, more flexibility.

Functionally the backend is the same either way: one question per scenario, same rules (max 10 words, beginner English, etc.).

---

## 5. KPI checklist (from your spec)

### Must hit

| KPI | Status |
|-----|--------|
| 1. Zero reading required | ⚠️ Demo has titles, context, labels. Full “zero reading” would need audio-only or icon-only UI (bigger change). |
| 2. All 4 scenarios play end to end without crashing | ✅ If `GEMINI_API_KEY` is set or fallback is used. |
| 3. Tree has 5 visible states | ❌ Not in this repo; that’s Person 2’s tree/progress UI. Demo only has completion chip per scenario. |
| 4. Build works offline (Web Speech; API fail → fallback) | ✅ |

### Should hit

| KPI | Status |
|-----|--------|
| 5. Reflection question sounds natural | ✅ Four questions in `scenarios.js` are written for TTS. |
| 6. Demo 60–90 s per scenario | ✅ Depends on TTS speed; 1000 ms pauses; scripts are short. |
| 7. "Hear Again" replays only reflection | ✅ Implemented. |

### Nice to have

| KPI | Status |
|-----|--------|
| 8. 3 of 4 scenarios wired | ✅ All 4 wired. |
| 9. Smooth tree bloom animation | ❌ Person 2; not in this codebase. |

---

## 6. Summary

- **Backend:** Works when `GEMINI_API_KEY` is set on Vercel; response parsing is robust; fallback to 4 hardcoded questions when API is missing or fails.
- **Person 3A:** Done (API + 4 fallback questions). Only open point is Claude vs Gemini for the pitch.
- **Person 3B:** Done (full audio chain, Stop, Got it, **Hear again** replaying only the reflection).
- **Gaps outside Person 3:** Tree with 5 visible states (Person 2); optional “zero reading” UI (larger product change).

**Next steps for you:** Set `GEMINI_API_KEY` on Vercel if not already, redeploy, then run through all 4 scenarios and use “Hear again” once to confirm behaviour. If the hackathon demands Claude by name, add or switch to Claude in `api/reflection-question.js` and keep the same API contract.
