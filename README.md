# AIForGood — Branch (Language Learning for Rohingya Community)

A web application for oral first-language learning, designed for the Rohingya community in Waterloo. Built for accessibility, with minimal text, strong audio/visual support, and scenario-based lessons for newcomers and refugees with low literacy.

## Features

- **Branching tree learning path** — Visual, intuitive progression through lessons
- **Listen & speak** — Phrase display with audio playback, then voice practice
- **Scenario-based content** — Grocery, employment, healthcare, school, social situations
- **Culturally appropriate** — Calming green theme, universal icons, inclusive design
- **Low-literacy friendly** — Icon-driven UI, minimal text, clear progress indicators

## Audio pipeline (CareVoice hackathon demo)

CareVoice role 3 starter pipeline for the hackathon demo. This repo contains a no-API audio pipeline you can use right away:

- Local scenario data for 4 PSW-focused lessons
- Browser speech synthesis for dialogue, cultural narration, key phrase repetition, and reflection question playback
- A simple completion handoff point for the tree/progress logic
- A tiny browser demo so the team can test the sequencing before the full UI lands

### What you do not need yet

- No Rohingya API
- No text-to-speech API
- No login
- No database

### Pipeline files

- `src/pipeline/scenarios.js`: scenario content plus future prompt context helper
- `src/pipeline/speechPipeline.js`: browser speech sequencer
- `demo/index.html`: quick demo page
- `demo/app.js`: demo wiring and completion callback
- `demo/styles.css`: lightweight styling for the demo page

### Quick test (audio demo)

1. Open `demo/index.html` in a browser.
2. Click a scenario card.
3. Click `Play lesson`.
4. Listen for: dialogue → narration → key phrase → reflection question.
5. Click `Got it` to simulate the completion handoff.

The audio must be started by a button click because browsers block autoplay.

### Team handoff

Person 1:
- Trigger `pipeline.playScenario(selectedScenario, callbacks)` from the main play button.
- Use the `onStateChange` callback to drive waveform or active-step UI.

Person 2:
- Replace the demo `markScenarioComplete` function with `markComplete(scenarioId)`.
- The pipeline intentionally waits for a user action on `Got it` before marking completion.

Future Claude step:
- Keep the existing system prompt.
- Replace `scenario.reflectionQuestion` with a question returned by your API route.
- Use `buildReflectionPromptContext(scenario)` as the scenario payload.

---

## Run locally (main app)

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Tech

- React 18 + Vite
- React Router
- Web Speech API (browser TTS for demo)
