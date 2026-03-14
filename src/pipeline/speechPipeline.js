(function (global) {
  const DEFAULT_SETTINGS = {
    pauseMs: 1000,
    dialogueRate: 0.96,
    narrationRate: 0.92,
    keyPhraseRate: 0.85,
    reflectionRate: 0.88,
    pitch: 1,
    volume: 1,
    preferredVoiceName: ""
  };

  function supportsSpeechSynthesis() {
    return Boolean(
      global &&
      global.speechSynthesis &&
      typeof global.SpeechSynthesisUtterance === "function"
    );
  }

  function delay(ms) {
    return new Promise(function (resolve) {
      global.setTimeout(resolve, ms);
    });
  }

  function normalizeVoice(voice) {
    return {
      name: voice.name,
      lang: voice.lang,
      default: Boolean(voice.default)
    };
  }

  function loadVoices(timeoutMs) {
    if (!supportsSpeechSynthesis()) {
      return Promise.resolve([]);
    }

    const synth = global.speechSynthesis;
    const initialVoices = synth.getVoices().filter(Boolean);

    if (initialVoices.length > 0) {
      return Promise.resolve(initialVoices);
    }

    return new Promise(function (resolve) {
      let settled = false;
      const timeoutId = global.setTimeout(finish, timeoutMs || 1500);

      function finish() {
        if (settled) {
          return;
        }

        settled = true;

        if (typeof synth.removeEventListener === "function") {
          synth.removeEventListener("voiceschanged", finish);
        }

        global.clearTimeout(timeoutId);
        resolve(synth.getVoices().filter(Boolean));
      }

      if (typeof synth.addEventListener === "function") {
        synth.addEventListener("voiceschanged", finish);
      } else {
        synth.onvoiceschanged = finish;
      }
    });
  }

  function chooseVoice(voices, preferredVoiceName) {
    if (!voices || voices.length === 0) {
      return null;
    }

    if (preferredVoiceName) {
      const preferredVoice = voices.find(function (voice) {
        return voice.name === preferredVoiceName;
      });

      if (preferredVoice) {
        return preferredVoice;
      }
    }

    const preferredLangs = ["en-CA", "en-US", "en-GB", "en-AU"];

    for (let index = 0; index < preferredLangs.length; index += 1) {
      const lang = preferredLangs[index];
      const match = voices.find(function (voice) {
        return String(voice.lang || "").toLowerCase() === lang.toLowerCase();
      });

      if (match) {
        return match;
      }
    }

    return voices.find(function (voice) {
      return String(voice.lang || "").toLowerCase().indexOf("en") === 0;
    }) || voices[0];
  }

  function flattenDialogue(dialogue) {
    return dialogue.map(function (turn) {
      return turn.speaker + ". " + turn.text;
    }).join(" ");
  }

  function buildSegments(scenario) {
    return [
      {
        id: "dialogue",
        label: "Dialogue",
        text: flattenDialogue(scenario.dialogue),
        rate: DEFAULT_SETTINGS.dialogueRate
      },
      {
        id: "narration",
        label: "Cultural Tip",
        text: scenario.culturalNarration.join(" "),
        rate: DEFAULT_SETTINGS.narrationRate
      },
      {
        id: "key_phrase",
        label: "Key Phrase",
        text: "Key phrase. " + scenario.keyPhrase + " " + scenario.keyPhrase,
        rate: DEFAULT_SETTINGS.keyPhraseRate
      },
      {
        id: "reflection",
        label: "Reflection Question",
        text: scenario.reflectionQuestion,
        rate: DEFAULT_SETTINGS.reflectionRate
      }
    ];
  }

  function createSpeechPipeline(options) {
    const settings = Object.assign({}, DEFAULT_SETTINGS, options || {});
    let runId = 0;

    function stop() {
      runId += 1;

      if (supportsSpeechSynthesis()) {
        global.speechSynthesis.cancel();
      }
    }

    function speakSegment(text, voice, rate) {
      return new Promise(function (resolve, reject) {
        if (!supportsSpeechSynthesis()) {
          reject(new Error("Speech synthesis is not available in this browser."));
          return;
        }

        const utterance = new global.SpeechSynthesisUtterance(text);
        utterance.voice = voice;
        utterance.lang = voice && voice.lang ? voice.lang : "en-CA";
        utterance.rate = rate;
        utterance.pitch = settings.pitch;
        utterance.volume = settings.volume;

        utterance.onend = function () {
          resolve();
        };

        utterance.onerror = function (event) {
          if (event && event.error === "interrupted") {
            resolve();
            return;
          }

          reject(new Error("Speech playback failed."));
        };

        global.speechSynthesis.speak(utterance);
      });
    }

    async function playSegments(scenario, segments, callbacks) {
      const safeCallbacks = callbacks || {};

      if (!supportsSpeechSynthesis()) {
        throw new Error("Speech synthesis is not supported in this browser.");
      }

      stop();
      const currentRunId = ++runId;
      const voices = await loadVoices();
      const voice = chooseVoice(voices, settings.preferredVoiceName);

      if (safeCallbacks.onStateChange) {
        safeCallbacks.onStateChange({
          status: "playing",
          phase: "starting",
          scenarioId: scenario.id,
          voice: voice ? normalizeVoice(voice) : null
        });
      }

      for (let index = 0; index < segments.length; index += 1) {
        const segment = segments[index];

        if (currentRunId !== runId) {
          return;
        }

        if (safeCallbacks.onSegmentStart) {
          safeCallbacks.onSegmentStart({
            scenarioId: scenario.id,
            phase: segment.id,
            label: segment.label,
            text: segment.text,
            index: index
          });
        }

        if (safeCallbacks.onStateChange) {
          safeCallbacks.onStateChange({
            status: "playing",
            phase: segment.id,
            scenarioId: scenario.id,
            text: segment.text,
            label: segment.label
          });
        }

        await speakSegment(segment.text, voice, segment.rate);

        if (currentRunId !== runId) {
          return;
        }

        if (index < segments.length - 1 && settings.pauseMs > 0) {
          if (safeCallbacks.onPause) {
            safeCallbacks.onPause({
              scenarioId: scenario.id,
              afterPhase: segment.id,
              pauseMs: settings.pauseMs
            });
          }

          await delay(settings.pauseMs);
        }
      }

      if (currentRunId !== runId) {
        return;
      }

      if (safeCallbacks.onStateChange) {
        safeCallbacks.onStateChange({
          status: "complete",
          phase: "complete",
          scenarioId: scenario.id
        });
      }

      if (safeCallbacks.onComplete) {
        safeCallbacks.onComplete({
          scenarioId: scenario.id
        });
      }
    }

    function playScenario(scenario, callbacks) {
      return playSegments(scenario, buildSegments(scenario), callbacks);
    }

    function playReflectionQuestion(scenario, callbacks) {
      const reflectionSegment = buildSegments(scenario).find(function (segment) {
        return segment.id === "reflection";
      });

      if (!reflectionSegment) {
        return Promise.reject(new Error("Reflection question segment is missing."));
      }

      return playSegments(scenario, [reflectionSegment], callbacks);
    }

    function setPreferredVoiceName(name) {
      settings.preferredVoiceName = name || "";
    }

    return {
      playScenario: playScenario,
      playReflectionQuestion: playReflectionQuestion,
      stop: stop,
      loadVoices: loadVoices,
      setPreferredVoiceName: setPreferredVoiceName,
      getSettings: function () {
        return Object.assign({}, settings);
      }
    };
  }

  global.CareVoicePipeline = {
    supportsSpeechSynthesis: supportsSpeechSynthesis,
    loadVoices: loadVoices,
    chooseVoice: chooseVoice,
    buildSegments: buildSegments,
    createSpeechPipeline: createSpeechPipeline
  };
})(globalThis);
