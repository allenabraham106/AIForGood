# AIForGood

CareVoice role 3 starter pipeline for the hackathon demo.

This repo now contains a no-API audio pipeline you can use right away:

- Finalized local scenario data for 4 PSW-focused lessons
- Browser speech synthesis for dialogue, cultural narration, key phrase repetition, and reflection question playback
- Browser speech intake for optional speaking practice on the key phrase
- Non-hardcoded word-by-word coloring from red to green based on what the browser heard
- A simple completion handoff point for the tree and progress logic
- A tiny browser demo so the team can test the sequencing before the full UI lands

## What you do not need yet

- No Rohingya API
- No text-to-speech API
- No login
- No database

## Honest limitation

The new speaking check is real, but it is not true phoneme-level pronunciation scoring.
It uses browser speech recognition to hear what the learner said, then compares the heard transcript to the target key phrase and colors each target word from red to green based on match quality.
That means it works as a practical spoken-match check, but it should not be pitched as a clinical pronunciation assessment.

Speech recognition support is browser-dependent and usually works best in Chrome or Edge with microphone permission enabled.
In many browsers it also depends on a network-backed recognition service even though speech synthesis can run locally.

## Files

- `src/pipeline/scenarios.js`: scenario content plus future prompt context helper
- `src/pipeline/speechPipeline.js`: browser speech sequencer with reflection replay support
- `src/pipeline/speechPractice.js`: browser speech intake plus scoring and word coloring logic
- `demo/index.html`: quick demo page
- `demo/app.js`: demo wiring, sequential unlocks, speaking check, and completion callback placeholder
- `demo/styles.css`: lightweight styling for the demo page

## Quick test

1. Open `demo/index.html` in a browser.
2. Click the unlocked scenario card.
3. Click `Play lesson`.
4. Listen for: dialogue -> narration -> key phrase -> reflection question.
5. Click `Hear Again` to replay only the reflection question.
6. Click `Start speaking` and say the key phrase.
7. Look at the red-to-green word colors and transcript.
8. Click `I Understood` to simulate the completion handoff and unlock the next lesson.

The audio and speech intake must be started by a user click because browsers block autoplay and microphone access without interaction.

## Team handoff

Person 1:
- Trigger `pipeline.playScenario(selectedScenario, callbacks)` from the main play button.
- Use the `onStateChange` callback to drive waveform or active-step UI.

Person 2:
- Replace the demo completion handler with `markComplete(scenarioId)`.
- The pipeline intentionally waits for a user action on `I Understood` before marking completion.

Person 3A:
- Keep the fallback `reflectionQuestion` text in `scenarios.js`.
- Replace it with the Claude output when the API call is ready.
- Use `buildReflectionPromptContext(scenario)` as the scenario payload.
