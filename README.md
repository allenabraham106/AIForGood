# AIForGood

CareVoice role 3 starter pipeline for the hackathon demo.

This repo now supports two speaking-check modes:

- Azure pronunciation assessment for real word and syllable scoring
- Browser fallback matching when Azure is not configured yet

The lesson playback path is still browser speech synthesis for:

- dialogue
- cultural narration
- key phrase repetition
- reflection question playback

You can also switch lesson audio between:

- full lesson
- key phrase plus reflection
- key phrase only

## Files

- `server.js`: local static server plus short-lived Azure token endpoint
- `.env.example`: copy this to `.env.local` and add your Azure values
- `src/pipeline/scenarios.js`: scenario content plus future prompt context helper
- `src/pipeline/speechPipeline.js`: browser speech sequencer with replay support and segment filtering
- `src/pipeline/speechPractice.js`: Azure pronunciation path plus browser fallback logic
- `demo/index.html`: quick demo page
- `demo/app.js`: demo wiring, sequential unlocks, speaking check, and completion callback placeholder
- `demo/styles.css`: lightweight styling for the demo page

## Where to put the Azure key

1. Copy `.env.example` to `.env.local`.
2. Paste one of your Azure Speech keys into `AZURE_SPEECH_KEY`.
3. Set `AZURE_SPEECH_REGION` to your Speech resource region, for example `canadacentral`.
4. Leave `AZURE_SPEECH_LANGUAGE=en-US` so Azure can return syllable groups.
5. Leave `AZURE_SPEECH_ENABLE_PROSODY=false` for the free-safe setup.

Example:

```env
AZURE_SPEECH_KEY=your_key_here
AZURE_SPEECH_REGION=canadacentral
AZURE_SPEECH_LANGUAGE=en-US
AZURE_SPEECH_ENABLE_PROSODY=false
PORT=3000
```

Do not put the raw key into `demo/app.js` or `demo/index.html`.
The browser fetches a short-lived token from `server.js`, so the key stays in `.env.local`.

## Run it

1. From the repo root, run `node server.js`.
2. Open `http://127.0.0.1:3000/demo/`.
3. Allow microphone access.
4. Choose the lesson audio mode you want.
5. Click `Play lesson` for the lesson flow.
6. Click `Start speaking` for the Azure speaking check.

## What happens in each speaking mode

If Azure is configured:
- The app asks the local server for a short-lived Azure token.
- Azure grades the spoken key phrase.
- Words are colored red to green using Azure pronunciation scores.
- If Azure returns syllables, they appear in the `Weakest sounds` section.
- If Azure returns phonemes without syllables, the app shows those instead.

If Azure is not configured:
- The app falls back to the browser speech recognizer.
- It compares the heard transcript to the target phrase.
- Word coloring still works, but it is transcript-match quality, not true pronunciation scoring.

## Honest limitation

The Azure path still needs a real browser run with your own key and microphone to fully verify end to end.
The browser fallback path works without Azure, but it should not be pitched as a phoneme-level pronunciation assessment.

## Team handoff

Person 1:
- Trigger `pipeline.playScenario(selectedScenario, callbacks, options)` from the main play button.
- Use the `onStateChange` callback to drive waveform or active-step UI.

Person 2:
- Replace the demo completion handler with `markComplete(scenarioId)`.
- The pipeline intentionally waits for a user action on `I Understood` before marking completion.

Person 3A:
- Keep the fallback `reflectionQuestion` text in `scenarios.js`.
- Replace it with the Claude output when the API call is ready.
- Use `buildReflectionPromptContext(scenario)` as the scenario payload.
