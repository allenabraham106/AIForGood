(function (global) {
  const DEFAULT_SETTINGS = {
    pauseMs: 1000,
    dialogueRate: 0.96,
    narrationRate: 0.92,
    keyPhraseRate: 0.85,
    reflectionRate: 0.88,
    coachingRate: 0.82,
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

  function selectSegments(scenario, options) {
    const allSegments = buildSegments(scenario);
    const safeOptions = options || {};

    if (!Array.isArray(safeOptions.segmentIds) || safeOptions.segmentIds.length === 0) {
      return allSegments;
    }

    return safeOptions.segmentIds.map(function (segmentId) {
      return allSegments.find(function (segment) {
        return segment.id === segmentId;
      }) || null;
    }).filter(Boolean);
  }

  function normalizeCustomItems(items) {
    return (Array.isArray(items) ? items : []).map(function (item, index) {
      if (typeof item === "string") {
        return {
          id: "custom-" + index,
          label: "Voice Feedback",
          text: item,
          rate: DEFAULT_SETTINGS.coachingRate,
          pauseMs: DEFAULT_SETTINGS.pauseMs
        };
      }

      return {
        id: item && item.id ? String(item.id) : "custom-" + index,
        label: item && item.label ? String(item.label) : "Voice Feedback",
        text: item && item.text ? String(item.text) : "",
        rate: item && typeof item.rate === "number" ? item.rate : DEFAULT_SETTINGS.coachingRate,
        pauseMs: item && typeof item.pauseMs === "number" ? item.pauseMs : DEFAULT_SETTINGS.pauseMs
      };
    }).filter(function (item) {
      return item.text.trim().length > 0;
    });
  }
  function splitTextIntoChunks(text, maxLength) {
    const cleaned = String(text || "").replace(/\s+/g, " ").trim();

    if (!cleaned) {
      return [];
    }

    const sentenceParts = cleaned.match(/[^.!?]+[.!?]?/g) || [cleaned];
    const chunks = [];
    let currentChunk = "";
    const limit = typeof maxLength === "number" && maxLength > 0 ? maxLength : 160;

    sentenceParts.map(function (part) {
      return part.trim();
    }).filter(Boolean).forEach(function (part) {
      if (!currentChunk) {
        currentChunk = part;
        return;
      }

      const nextChunk = currentChunk + " " + part;

      if (nextChunk.length <= limit) {
        currentChunk = nextChunk;
      } else {
        chunks.push(currentChunk);
        currentChunk = part;
      }
    });

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  function createSpeechPipeline(options) {
    const settings = Object.assign({}, DEFAULT_SETTINGS, options || {});
    let runId = 0;
    let hasPrimedSpeech = false;

    function stop() {
      runId += 1;

      if (supportsSpeechSynthesis()) {
        const synth = global.speechSynthesis;

        if (synth.speaking || synth.pending || synth.paused) {
          synth.cancel();
        }
      }
    }
    function primeSpeechSynthesis(voice) {
      return new Promise(function (resolve) {
        if (!supportsSpeechSynthesis()) {
          resolve();
          return;
        }

        const synth = global.speechSynthesis;

        if (typeof synth.resume === "function") {
          synth.resume();
        }

        if (hasPrimedSpeech) {
          resolve();
          return;
        }

        const utterance = new global.SpeechSynthesisUtterance(".");
        let settled = false;

        utterance.voice = voice;
        utterance.lang = voice && voice.lang ? voice.lang : "en-US";
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 0;

        function finish() {
          if (settled) {
            return;
          }

          settled = true;
          hasPrimedSpeech = true;
          resolve();
        }

        utterance.onend = finish;
        utterance.onerror = finish;
        synth.speak(utterance);
        global.setTimeout(finish, 120);
      });
    }

    function speakSegment(text, voice, rate) {
      return new Promise(function (resolve, reject) {
        if (!supportsSpeechSynthesis()) {
          reject(new Error("Speech synthesis is not available in this browser."));
          return;
        }

        const synth = global.speechSynthesis;
        const utterance = new global.SpeechSynthesisUtterance(text);
        utterance.voice = voice;
        utterance.lang = voice && voice.lang ? voice.lang : "en-US";
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

          reject(new Error(event && event.error ? "Speech playback failed: " + event.error + "." : "Speech playback failed."));
        };

        if (typeof synth.resume === "function") {
          synth.resume();
        }

        synth.speak(utterance);
      });
    }

    async function playItems(contextId, items, callbacks) {
      const safeCallbacks = callbacks || {};
      const normalizedItems = normalizeCustomItems(items);

      if (!supportsSpeechSynthesis()) {
        throw new Error("Speech synthesis is not supported in this browser.");
      }

      if (normalizedItems.length === 0) {
        throw new Error("Choose at least one lesson part to play.");
      }

      stop();
      await delay(80);
      const currentRunId = ++runId;
      const voices = await loadVoices();
      const voice = chooseVoice(voices, settings.preferredVoiceName);
      await primeSpeechSynthesis(voice);

      if (safeCallbacks.onStateChange) {
        safeCallbacks.onStateChange({
          status: "playing",
          phase: "starting",
          scenarioId: contextId,
          voice: voice ? normalizeVoice(voice) : null
        });
      }

      for (let index = 0; index < normalizedItems.length; index += 1) {
        const item = normalizedItems[index];

        if (currentRunId !== runId) {
          return;
        }

        if (safeCallbacks.onSegmentStart) {
          safeCallbacks.onSegmentStart({
            scenarioId: contextId,
            phase: item.id,
            label: item.label,
            text: item.text,
            index: index
          });
        }

        if (safeCallbacks.onStateChange) {
          safeCallbacks.onStateChange({
            status: "playing",
            phase: item.id,
            scenarioId: contextId,
            text: item.text,
            label: item.label
          });
        }

        const chunks = splitTextIntoChunks(item.text, 160);

        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex += 1) {
          if (currentRunId !== runId) {
            return;
          }

          await speakSegment(chunks[chunkIndex], voice, item.rate);

          if (chunkIndex < chunks.length - 1) {
            await delay(90);
          }
        }

        if (currentRunId !== runId) {
          return;
        }

        const pauseMs = typeof item.pauseMs === "number" ? item.pauseMs : settings.pauseMs;

        if (index < normalizedItems.length - 1 && pauseMs > 0) {
          if (safeCallbacks.onPause) {
            safeCallbacks.onPause({
              scenarioId: contextId,
              afterPhase: item.id,
              pauseMs: pauseMs
            });
          }

          await delay(pauseMs);
        }
      }

      if (currentRunId !== runId) {
        return;
      }

      if (safeCallbacks.onStateChange) {
        safeCallbacks.onStateChange({
          status: "complete",
          phase: "complete",
          scenarioId: contextId
        });
      }

      if (safeCallbacks.onComplete) {
        safeCallbacks.onComplete({
          scenarioId: contextId
        });
      }
    }

    function playScenario(scenario, callbacks, options) {
      const segments = selectSegments(scenario, options).map(function (segment) {
        return {
          id: segment.id,
          label: segment.label,
          text: segment.text,
          rate: segment.rate,
          pauseMs: settings.pauseMs
        };
      });

      return playItems(scenario.id, segments, callbacks);
    }

    function playSegmentIds(scenario, segmentIds, callbacks) {
      return playScenario(scenario, callbacks, {
        segmentIds: segmentIds
      });
    }

    function playReflectionQuestion(scenario, callbacks) {
      return playSegmentIds(scenario, ["reflection"], callbacks);
    }

    function playVoiceCoaching(contextId, items, callbacks) {
      return playItems(contextId, items, callbacks);
    }

    function setPreferredVoiceName(name) {
      settings.preferredVoiceName = name || "";
    }

    return {
      playScenario: playScenario,
      playSegmentIds: playSegmentIds,
      playReflectionQuestion: playReflectionQuestion,
      playVoiceCoaching: playVoiceCoaching,
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




