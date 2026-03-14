(function () {
  const storageKey = "carevoice-demo-completed";
  const segmentOrder = ["dialogue", "narration", "key_phrase", "reflection"];
  const lessonModeSegments = {
    full: ["dialogue", "narration", "key_phrase", "reflection"],
    practice: ["key_phrase", "reflection"],
    key_phrase_only: ["key_phrase"]
  };

  const titleElement = document.querySelector("[data-title]");
  const contextElement = document.querySelector("[data-context]");
  const scenarioListElement = document.querySelector("[data-scenario-list]");
  const segmentListElement = document.querySelector("[data-segment-list]");
  const statusPillElement = document.querySelector("[data-status-pill]");
  const phaseChipElement = document.querySelector("[data-phase-chip]");
  const completionChipElement = document.querySelector("[data-completion-chip]");
  const playButton = document.querySelector("[data-play-button]");
  const actionButton = document.querySelector("[data-action-button]");
  const completeButton = document.querySelector("[data-complete-button]");
  const resetProgressButton = document.querySelector("[data-reset-progress]");
  const voiceSelect = document.querySelector("[data-voice-select]");
  const lessonModeSelect = document.querySelector("[data-lesson-mode]");
  const practiceBadgeElement = document.querySelector("[data-practice-badge]");
  const practiceProviderElement = document.querySelector("[data-practice-provider]");
  const practiceMetricsElement = document.querySelector("[data-practice-metrics]");
  const practiceTargetElement = document.querySelector("[data-practice-target]");
  const practiceStatusElement = document.querySelector("[data-practice-status]");
  const practiceScoreElement = document.querySelector("[data-practice-score]");
  const practiceTranscriptElement = document.querySelector("[data-practice-transcript]");
  const practiceBreakdownElement = document.querySelector("[data-practice-breakdown]");
  const practiceStartButton = document.querySelector("[data-practice-start-button]");
  const practiceStopButton = document.querySelector("[data-practice-stop-button]");

  const scenarios = globalThis.CareVoiceScenarios.scenarios;
  const pipeline = globalThis.CareVoicePipeline.createSpeechPipeline();
  const practice = globalThis.CareVoicePractice.createSpeechPractice({
    lang: "en-CA"
  });

  let selectedScenarioId = scenarios[0].id;
  let completedScenarioIds = normalizeCompletedScenarioIds(loadCompletedScenarioIds());
  let activePhase = "";
  let completedPhases = [];
  let readyToComplete = false;
  let isPlaying = false;
  let currentPlaybackMode = "idle";
  let replaySegmentIds = ["reflection"];
  let lessonPlaybackMode = lessonModeSelect ? lessonModeSelect.value : "full";
  let isListening = false;
  let isPracticeProcessing = false;
  let practiceStopRequested = false;
  let practiceInterimTranscript = "";
  let practiceStatusMessage = "";
  let practiceStatusIsError = false;
  let practiceRuntimeInfo = {
    available: globalThis.CareVoicePractice.supportsSpeechRecognition(),
    preferredProvider: globalThis.CareVoicePractice.supportsSpeechRecognition() ? "browser" : "none",
    label: globalThis.CareVoicePractice.supportsSpeechRecognition() ? "Browser Fallback" : "Checking",
    supportText: "Checking the speaking check provider."
  };
  const practiceResultsByScenarioId = {};

  ensureSelectedScenarioIsUnlocked();
  renderScenarioCards();
  renderSelectedScenario();
  renderSegmentList();
  renderPractice();
  hydrateVoices();
  hydratePracticeRuntime();
  syncControls("idle");

  if (!globalThis.CareVoicePipeline.supportsSpeechSynthesis()) {
    setStatus("Speech synthesis is not supported in this browser.", true);
    playButton.disabled = true;
    actionButton.disabled = true;
    voiceSelect.disabled = true;
  }

  playButton.addEventListener("click", function () {
    if (!isSelectedScenarioUnlocked()) {
      setStatus("Finish the earlier lesson first.", true);
      return;
    }

    startSelectedPlayback();
  });

  actionButton.addEventListener("click", function () {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    if (readyToComplete) {
      startReplayPlayback();
    }
  });

  completeButton.addEventListener("click", function () {
    if (!readyToComplete || isListening || isPracticeProcessing) {
      return;
    }

    const scenario = getSelectedScenario();

    markScenarioComplete(scenario.id);
    readyToComplete = false;
    isPlaying = false;
    currentPlaybackMode = "idle";
    activePhase = "";
    completedPhases = [];
    practiceStatusMessage = "";
    practiceStatusIsError = false;
    practiceInterimTranscript = "";
    selectNextScenarioAfterCompletion();
    renderScenarioCards();
    renderSelectedScenario();
    renderSegmentList();
    renderPractice();
    syncControls("idle");

    if (completedScenarioIds.length === scenarios.length) {
      phaseChipElement.textContent = "All lessons complete";
      setStatus("All four scenarios are complete. Replace this with Person 2's markComplete call.", false);
      return;
    }

    phaseChipElement.textContent = "Next lesson unlocked";
    setStatus("Scenario marked complete. Replace this with Person 2's markComplete call.", false);
  });

  resetProgressButton.addEventListener("click", function () {
    pipeline.stop();
    stopPracticeListening(true);
    completedScenarioIds = [];
    persistCompletedScenarioIds();
    selectedScenarioId = scenarios[0].id;
    readyToComplete = false;
    isPlaying = false;
    currentPlaybackMode = "idle";
    activePhase = "";
    completedPhases = [];
    practiceStatusMessage = "";
    practiceStatusIsError = false;
    practiceInterimTranscript = "";

    Object.keys(practiceResultsByScenarioId).forEach(function (scenarioId) {
      delete practiceResultsByScenarioId[scenarioId];
    });

    renderScenarioCards();
    renderSelectedScenario();
    renderSegmentList();
    renderPractice();
    syncControls("idle");
    phaseChipElement.textContent = "Waiting to start";
    setStatus("Demo progress reset.", false);
  });

  voiceSelect.addEventListener("change", function () {
    pipeline.setPreferredVoiceName(voiceSelect.value);
    setStatus("Voice updated.", false);
  });

  if (lessonModeSelect) {
    lessonModeSelect.addEventListener("change", function () {
      lessonPlaybackMode = lessonModeSelect.value || "full";
      readyToComplete = false;
      currentPlaybackMode = "idle";
      activePhase = "";
      completedPhases = [];
      replaySegmentIds = getReplaySegmentIds();
      renderSegmentList();
      renderPractice();
      syncControls("idle");
      setStatus("Lesson audio mode updated.", false);
    });
  }

  practiceStartButton.addEventListener("click", function () {
    startPracticeListening();
  });

  practiceStopButton.addEventListener("click", function () {
    stopPracticeListening(false);
  });

  function hydratePracticeRuntime() {
    practice.getRuntimeInfo().then(function (info) {
      practiceRuntimeInfo = info;
      renderPractice();
      syncControls(getControlMode());
    }).catch(function () {
      practiceRuntimeInfo = {
        available: globalThis.CareVoicePractice.supportsSpeechRecognition(),
        preferredProvider: globalThis.CareVoicePractice.supportsSpeechRecognition() ? "browser" : "none",
        label: globalThis.CareVoicePractice.supportsSpeechRecognition() ? "Browser Fallback" : "Unavailable",
        supportText: globalThis.CareVoicePractice.supportsSpeechRecognition()
          ? "The local server did not answer, so the app will use the browser fallback."
          : "Speech intake is not available in this browser."
      };
      renderPractice();
      syncControls(getControlMode());
    });
  }

  function getLessonSegmentIds() {
    return lessonModeSegments[lessonPlaybackMode] || lessonModeSegments.full;
  }

  function getReplaySegmentIds() {
    const selectedSegmentIds = getLessonSegmentIds();

    if (selectedSegmentIds.indexOf("reflection") !== -1) {
      return ["reflection"];
    }

    return [selectedSegmentIds[selectedSegmentIds.length - 1]];
  }

  function getReplayButtonLabel() {
    return replaySegmentIds[0] === "key_phrase" ? "Hear Key Phrase Again" : "Hear Again";
  }

  function startSelectedPlayback() {
    const scenario = getSelectedScenario();
    const selectedSegmentIds = getLessonSegmentIds();

    stopPracticeListening(true);
    readyToComplete = false;
    isPlaying = true;
    currentPlaybackMode = "full";
    activePhase = "";
    completedPhases = [];
    replaySegmentIds = getReplaySegmentIds();
    renderSegmentList();
    renderScenarioCards();
    renderPractice();
    syncControls("playing");
    setStatus("Playing " + scenario.title + ".", false);
    phaseChipElement.textContent = selectedSegmentIds.length === segmentOrder.length
      ? "Starting lesson"
      : "Playing selected lesson parts";

    pipeline.playScenario(scenario, buildPlaybackCallbacks("full"), {
      segmentIds: selectedSegmentIds
    }).catch(handlePlaybackError);
  }

  function startReplayPlayback() {
    const scenario = getSelectedScenario();

    stopPracticeListening(true);
    readyToComplete = false;
    isPlaying = true;
    currentPlaybackMode = "replay";
    activePhase = "";
    completedPhases = segmentOrder.filter(function (segmentId) {
      return replaySegmentIds.indexOf(segmentId) === -1;
    });
    renderSegmentList();
    renderScenarioCards();
    renderPractice();
    syncControls("playing");
    setStatus("Replaying the selected practice part.", false);
    phaseChipElement.textContent = replaySegmentIds[0] === "key_phrase"
      ? "Replaying key phrase"
      : "Replaying reflection";

    pipeline.playSegmentIds(scenario, replaySegmentIds, buildPlaybackCallbacks("replay")).catch(handlePlaybackError);
  }

  function stopPlayback() {
    const stoppedMode = currentPlaybackMode;

    pipeline.stop();
    isPlaying = false;
    currentPlaybackMode = "idle";
    activePhase = "";

    if (stoppedMode === "replay") {
      readyToComplete = true;
      completedPhases = segmentOrder.slice();
      renderSegmentList();
      renderScenarioCards();
      renderPractice();
      syncControls("ready");
      phaseChipElement.textContent = "Replay stopped";
      setStatus("Replay stopped. You can replay again or tap I Understood.", false);
      return;
    }

    if (stoppedMode === "coaching") {
      renderScenarioCards();
      renderPractice();
      syncControls(getControlMode());
      phaseChipElement.textContent = readyToComplete ? "Lesson finished" : "Voice coaching stopped";
      setStatus("Voice feedback stopped.", false);
      return;
    }

    readyToComplete = false;
    completedPhases = [];
    renderSegmentList();
    renderScenarioCards();
    renderPractice();
    syncControls("idle");
    phaseChipElement.textContent = "Stopped";
    setStatus("Playback stopped.", false);
  }

  function buildPlaybackCallbacks(mode) {
    return {
      onSegmentStart: function (event) {
        activePhase = event.phase;

        if (mode === "replay") {
          completedPhases = segmentOrder.filter(function (segmentId) {
            return replaySegmentIds.indexOf(segmentId) === -1;
          }).concat(segmentOrder.slice(0, replaySegmentIds.indexOf(event.phase)).filter(function (segmentId) {
            return replaySegmentIds.indexOf(segmentId) !== -1;
          }));
        } else {
          completedPhases = segmentOrder.slice(0, segmentOrder.indexOf(event.phase));
        }

        renderSegmentList();
      },
      onStateChange: function (event) {
        if (event.status === "playing") {
          phaseChipElement.textContent = labelForPhase(event.phase);
        }

        if (event.status === "complete") {
          phaseChipElement.textContent = mode === "full" ? "Lesson finished" : "Replay finished";
          setStatus(
            mode === "full"
              ? "Lesson finished. Tap I Understood or replay the practice part."
              : "Replay finished. Tap I Understood or replay again.",
            false
          );
        }
      },
      onComplete: function () {
        readyToComplete = true;
        isPlaying = false;
        currentPlaybackMode = "idle";
        activePhase = "";
        completedPhases = segmentOrder.slice();
        renderSegmentList();
        renderScenarioCards();
        renderPractice();
        syncControls("ready");
      }
    };
  }

  function handlePlaybackError(error) {
    const failedMode = currentPlaybackMode;

    isPlaying = false;
    currentPlaybackMode = "idle";
    activePhase = "";

    if (failedMode === "replay") {
      readyToComplete = true;
      completedPhases = segmentOrder.slice();
      renderSegmentList();
      renderScenarioCards();
      renderPractice();
      syncControls("ready");
      phaseChipElement.textContent = "Replay failed";
      setStatus("Replay failed. You can try replaying again or continue.", true);
      return;
    }

    readyToComplete = false;
    completedPhases = [];
    renderSegmentList();
    renderScenarioCards();
    renderPractice();
    syncControls("idle");
    phaseChipElement.textContent = "Playback failed";
    setStatus(error.message, true);
  }

  function startPracticeListening() {
    const scenario = getSelectedScenario();

    if (!practiceRuntimeInfo.available) {
      practiceStatusMessage = practiceRuntimeInfo.supportText;
      practiceStatusIsError = true;
      renderPractice();
      return;
    }

    if (!isSelectedScenarioUnlocked() || isPlaying || isListening || isPracticeProcessing) {
      return;
    }

    isListening = true;
    isPracticeProcessing = false;
    practiceStopRequested = false;
    practiceInterimTranscript = "";
    practiceStatusMessage = practiceRuntimeInfo.preferredProvider === "azure"
      ? "Say the key phrase. When you finish, tap Finish answer and Azure will score it."
      : "Say the key phrase. When you finish, tap Finish answer so we can score what we heard.";
    practiceStatusIsError = false;
    renderScenarioCards();
    renderPractice();
    syncControls(getControlMode());

    practice.listenForPhrase(scenario.keyPhrase, {
      onStateChange: function (event) {
        if (event.status === "fallback") {
          practiceStatusMessage = event.message;
          practiceStatusIsError = false;
          practiceRuntimeInfo = Object.assign({}, practiceRuntimeInfo, {
            preferredProvider: "browser",
            label: "Browser Fallback"
          });
          renderPractice();
          return;
        }

        if (event.status === "finalizing") {
          isListening = false;
          isPracticeProcessing = true;
          practiceStatusMessage = "Finishing your answer and scoring it now.";
          practiceStatusIsError = false;
          renderScenarioCards();
          renderPractice();
          syncControls(getControlMode());
          return;
        }

        if (event.status === "processing") {
          isListening = false;
          isPracticeProcessing = true;
          practiceStatusMessage = event.provider === "azure"
            ? "Azure is scoring each word now. Spoken feedback will play next."
            : "Scoring your spoken answer now. Spoken feedback will play next.";
          practiceStatusIsError = false;
          renderScenarioCards();
          renderPractice();
          syncControls(getControlMode());
          return;
        }

        if (event.status === "listening") {
          isListening = true;
          isPracticeProcessing = false;
          practiceStatusMessage = event.provider === "azure"
            ? "Listening now. Say the key phrase, then tap Finish answer."
            : "Listening now. Say the key phrase, then tap Finish answer.";
          practiceStatusIsError = false;
          renderPractice();
        }
      },
      onInterim: function (event) {
        practiceInterimTranscript = event.transcript;
        renderPractice();
      }
    }).then(function (analysis) {
      isListening = false;
      isPracticeProcessing = false;
      practiceStopRequested = false;
      practiceInterimTranscript = "";
      practiceResultsByScenarioId[scenario.id] = analysis;
      practiceStatusMessage = analysis.message;
      practiceStatusIsError = false;
      renderScenarioCards();
      renderPractice();
      syncControls(getControlMode());
      playPracticeCoaching(scenario, analysis);
    }).catch(function (error) {
      isListening = false;
      isPracticeProcessing = false;
      practiceInterimTranscript = "";

      if (error && error.code === "stopped") {
        practiceStopRequested = false;
        renderScenarioCards();
        renderPractice();
        syncControls(getControlMode());
        return;
      }

      practiceStopRequested = false;
      practiceStatusMessage = error.message;
      practiceStatusIsError = true;
      renderScenarioCards();
      renderPractice();
      syncControls(getControlMode());
    });
  }

  function stopPracticeListening(options) {
    const stopOptions = typeof options === "boolean"
      ? { discard: options, silent: options }
      : Object.assign({ discard: false, silent: false }, options || {});

    if (!isListening && !isPracticeProcessing) {
      return;
    }

    if (stopOptions.discard) {
      practiceStopRequested = true;
      isListening = false;
      isPracticeProcessing = false;
      practiceInterimTranscript = "";
      practice.stop({ discard: true });

      if (!stopOptions.silent) {
        practiceStatusMessage = "Listening stopped.";
        practiceStatusIsError = false;
      }

      renderScenarioCards();
      renderPractice();
      syncControls(getControlMode());
      return;
    }

    practiceStopRequested = false;
    isListening = false;
    isPracticeProcessing = true;
    practiceStatusMessage = "Finishing your answer and scoring it now.";
    practiceStatusIsError = false;
    practice.stop();
    renderScenarioCards();
    renderPractice();
    syncControls(getControlMode());
  }

  function playPracticeCoaching(scenario, analysis) {
    const coachingItems = globalThis.CareVoicePractice.buildVoiceCoachingPlan(analysis, {
      maxWords: 2
    });

    if (!coachingItems || coachingItems.length === 0 || !globalThis.CareVoicePipeline.supportsSpeechSynthesis()) {
      return;
    }

    isPlaying = true;
    currentPlaybackMode = "coaching";
    practiceStatusMessage = globalThis.CareVoicePractice.getWeakWordResults(analysis, 1).length > 0
      ? "Voice feedback is replaying the weakest word for another try."
      : "Voice feedback is replaying the full phrase one more time.";
    practiceStatusIsError = false;
    renderScenarioCards();
    renderPractice();
    syncControls("playing");
    phaseChipElement.textContent = "Voice coaching";
    setStatus("Playing spoken coaching.", false);

    pipeline.playVoiceCoaching("practice-" + scenario.id, coachingItems, {
      onComplete: function () {
        isPlaying = false;
        currentPlaybackMode = "idle";
        renderScenarioCards();
        renderPractice();
        syncControls(getControlMode());
        phaseChipElement.textContent = readyToComplete ? "Lesson finished" : "Voice coaching finished";
        setStatus("Spoken coaching finished. Try the phrase again when you are ready.", false);
      }
    }).catch(function () {
      isPlaying = false;
      currentPlaybackMode = "idle";
      renderScenarioCards();
      renderPractice();
      syncControls(getControlMode());
      phaseChipElement.textContent = readyToComplete ? "Lesson finished" : "Voice coaching failed";
      setStatus("Spoken coaching could not play, but the scoring stayed on screen.", true);
    });
  }

  function getControlMode() {
    if (isPlaying) {
      return "playing";
    }

    if (readyToComplete) {
      return "ready";
    }

    return "idle";
  }

  function syncControls(mode) {
    playButton.disabled = mode === "playing" || isListening || isPracticeProcessing || !isSelectedScenarioUnlocked();
    actionButton.disabled = mode === "idle" || isListening || isPracticeProcessing;
    actionButton.textContent = mode === "ready" ? getReplayButtonLabel() : "Stop";
    completeButton.disabled = mode !== "ready" || isListening || isPracticeProcessing;

    if (lessonModeSelect) {
      lessonModeSelect.disabled = mode === "playing" || isListening || isPracticeProcessing;
    }
  }

  function loadCompletedScenarioIds() {
    try {
      const raw = globalThis.localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      return [];
    }
  }

  function normalizeCompletedScenarioIds(ids) {
    return scenarios
      .map(function (scenario) {
        return scenario.id;
      })
      .filter(function (scenarioId) {
        return Array.isArray(ids) && ids.indexOf(scenarioId) !== -1;
      });
  }

  function persistCompletedScenarioIds() {
    globalThis.localStorage.setItem(storageKey, JSON.stringify(completedScenarioIds));
  }

  function getSelectedScenario() {
    return globalThis.CareVoiceScenarios.findScenarioById(selectedScenarioId);
  }

  function getSelectedScenarioIndex() {
    return scenarios.findIndex(function (scenario) {
      return scenario.id === selectedScenarioId;
    });
  }

  function isScenarioUnlocked(index) {
    return index <= completedScenarioIds.length;
  }

  function isSelectedScenarioUnlocked() {
    return isScenarioUnlocked(getSelectedScenarioIndex());
  }

  function ensureSelectedScenarioIsUnlocked() {
    const selectedIndex = getSelectedScenarioIndex();

    if (selectedIndex === -1 || !isScenarioUnlocked(selectedIndex)) {
      selectedScenarioId = scenarios[Math.min(completedScenarioIds.length, scenarios.length - 1)].id;
    }
  }

  function markScenarioComplete(scenarioId) {
    if (completedScenarioIds.indexOf(scenarioId) === -1) {
      completedScenarioIds = normalizeCompletedScenarioIds(completedScenarioIds.concat(scenarioId));
      persistCompletedScenarioIds();
    }
  }

  function selectNextScenarioAfterCompletion() {
    selectedScenarioId = scenarios[Math.min(completedScenarioIds.length, scenarios.length - 1)].id;
  }

  function hydrateVoices() {
    globalThis.CareVoicePipeline.loadVoices().then(function (voices) {
      const englishVoices = voices.filter(function (voice) {
        return String(voice.lang || "").toLowerCase().indexOf("en") === 0;
      });

      const displayVoices = englishVoices.length > 0 ? englishVoices : voices;

      if (displayVoices.length === 0) {
        const fallbackOption = document.createElement("option");
        fallbackOption.value = "";
        fallbackOption.textContent = "System default";
        voiceSelect.appendChild(fallbackOption);
        return;
      }

      displayVoices.forEach(function (voice, index) {
        const option = document.createElement("option");
        option.value = voice.name;
        option.textContent = voice.name + " (" + voice.lang + ")";
        voiceSelect.appendChild(option);

        if (index === 0) {
          option.selected = true;
          pipeline.setPreferredVoiceName(voice.name);
        }
      });
    });
  }

  function renderScenarioCards() {
    ensureSelectedScenarioIsUnlocked();
    scenarioListElement.innerHTML = "";

    scenarios.forEach(function (scenario, index) {
      const button = document.createElement("button");
      const done = completedScenarioIds.indexOf(scenario.id) !== -1;
      const unlocked = isScenarioUnlocked(index);
      const tagLabel = done ? "Completed" : unlocked ? "Ready" : "Locked";

      button.type = "button";
      button.className = "scenario-card";
      button.dataset.selected = String(scenario.id === selectedScenarioId);
      button.dataset.locked = String(!unlocked);
      button.disabled = !unlocked || isPlaying || isListening || isPracticeProcessing;
      button.innerHTML = [
        "<h3>" + scenario.title + "</h3>",
        "<p>" + scenario.context + "</p>",
        "<div class=\"scenario-meta\">",
        "<span>" + scenario.dialogue.length + " dialogue turns</span>",
        "<span class=\"scenario-tag\" data-done=\"" + String(done) + "\">" + tagLabel + "</span>",
        "</div>"
      ].join("");

      if (unlocked && !isPlaying && !isListening) {
        button.addEventListener("click", function () {
          selectedScenarioId = scenario.id;
          readyToComplete = false;
          currentPlaybackMode = "idle";
          activePhase = "";
          completedPhases = [];
          practiceStatusMessage = "";
          practiceStatusIsError = false;
          practiceInterimTranscript = "";
          replaySegmentIds = getReplaySegmentIds();
          renderScenarioCards();
          renderSelectedScenario();
          renderSegmentList();
          renderPractice();
          syncControls("idle");
          phaseChipElement.textContent = "Waiting to start";
          setStatus("Selected " + scenario.title + ".", false);
        });
      }

      scenarioListElement.appendChild(button);
    });
  }

  function renderSelectedScenario() {
    ensureSelectedScenarioIsUnlocked();

    const scenario = getSelectedScenario();
    const scenarioIndex = getSelectedScenarioIndex();
    const done = completedScenarioIds.indexOf(scenario.id) !== -1;
    const unlocked = isScenarioUnlocked(scenarioIndex);

    titleElement.textContent = scenario.title;
    contextElement.textContent = scenario.context;
    completionChipElement.dataset.complete = String(done);
    completionChipElement.textContent = done ? "Completed in demo" : unlocked ? "Unlocked" : "Locked";
  }

  function renderSegmentList() {
    const scenario = getSelectedScenario();
    const segments = globalThis.CareVoicePipeline.buildSegments(scenario);
    const activeSegmentIds = getLessonSegmentIds();

    segmentListElement.innerHTML = "";

    segments.forEach(function (segment) {
      const item = document.createElement("li");
      item.className = "segment-item";
      item.dataset.active = String(segment.id === activePhase);
      item.dataset.done = String(completedPhases.indexOf(segment.id) !== -1);
      item.dataset.skipped = String(activeSegmentIds.indexOf(segment.id) === -1);
      item.innerHTML = [
        "<span class=\"segment-label\">" + segment.label + "</span>",
        "<span class=\"segment-text\">" + segment.text + "</span>"
      ].join("");
      segmentListElement.appendChild(item);
    });
  }

  function renderPractice() {
    const scenario = getSelectedScenario();
    const practiceResult = practiceResultsByScenarioId[scenario.id] || null;
    const targetWords = practiceResult
      ? practiceResult.wordResults
      : globalThis.CareVoicePractice.tokenizeDetailed(scenario.keyPhrase).map(function (token) {
          return {
            targetWord: token.display,
            score: null,
            color: ""
          };
        });

    practiceTargetElement.innerHTML = "";

    targetWords.forEach(function (wordResult) {
      const wordElement = document.createElement("span");
      const quality = typeof wordResult.score === "number" ? qualityFromScore(wordResult.score) : "neutral";

      wordElement.className = "practice-word";
      wordElement.dataset.quality = quality;
      wordElement.textContent = wordResult.targetWord;

      if (typeof wordResult.score === "number") {
        wordElement.style.setProperty("--word-color", wordResult.color);
        wordElement.title = wordResult.matchedWord
          ? "Heard as: " + wordResult.matchedWord
          : "This word was missed or not heard clearly.";
      }

      practiceTargetElement.appendChild(wordElement);
    });

    practiceProviderElement.textContent = practiceResult ? practiceResult.providerLabel : practiceRuntimeInfo.label;
    practiceMetricsElement.textContent = practiceResult
      ? practiceResult.metricsText
      : practiceRuntimeInfo.preferredProvider === "azure"
        ? "Word and syllable scoring ready"
        : practiceRuntimeInfo.preferredProvider === "browser"
          ? "Transcript match only"
          : "No speech intake available";

    renderPracticeBreakdown(practiceResult);

    practiceBadgeElement.textContent = buildPracticeBadgeText(practiceResult);
    practiceBadgeElement.dataset.state = buildPracticeBadgeState(practiceResult);
    practiceStatusElement.dataset.error = String(practiceStatusIsError);
    practiceStatusElement.textContent = buildPracticeStatusText(practiceResult);
    practiceScoreElement.textContent = practiceResult
      ? "Spoken match: " + Math.round(practiceResult.overallScore * 100) + "%"
      : "Spoken match: --";
    practiceScoreElement.dataset.state = practiceResult ? practiceResult.ratingKey : "idle";

    if (isListening || isPracticeProcessing) {
      practiceTranscriptElement.textContent = practiceInterimTranscript || (isPracticeProcessing ? "Scoring your answer..." : "Listening...");
      practiceTranscriptElement.dataset.empty = "false";
    } else if (practiceResult) {
      practiceTranscriptElement.textContent = practiceResult.transcript;
      practiceTranscriptElement.dataset.empty = "false";
    } else {
      practiceTranscriptElement.textContent = "No attempt yet.";
      practiceTranscriptElement.dataset.empty = "true";
    }

    practiceStartButton.disabled = !canStartPractice();
    practiceStopButton.disabled = !isListening;
  }

  function renderPracticeBreakdown(practiceResult) {
    practiceBreakdownElement.innerHTML = "";

    if (!practiceResult) {
      practiceBreakdownElement.innerHTML = "<p class=\"practice-breakdown-empty\">Say the phrase to see the weakest sounds.</p>";
      return;
    }

    const wordsWithBreakdown = practiceResult.wordResults.filter(function (wordResult) {
      return (Array.isArray(wordResult.syllables) && wordResult.syllables.length > 0) ||
        (Array.isArray(wordResult.phonemes) && wordResult.phonemes.length > 0);
    });

    if (wordsWithBreakdown.length === 0) {
      practiceBreakdownElement.innerHTML = "<p class=\"practice-breakdown-empty\">Sub-word highlighting appears when Azure pronunciation is active.</p>";
      return;
    }

    wordsWithBreakdown.forEach(function (wordResult) {
      const breakdownParts = wordResult.syllables.length > 0 ? wordResult.syllables : wordResult.phonemes;
      const item = document.createElement("div");
      const label = document.createElement("p");
      const row = document.createElement("div");

      item.className = "practice-breakdown-item";
      label.className = "practice-breakdown-label";
      label.textContent = wordResult.targetWord + (wordResult.syllables.length > 0 ? " · syllables" : " · sounds");
      row.className = "practice-breakdown-row";

      breakdownParts.forEach(function (part) {
        const chip = document.createElement("span");
        chip.className = "practice-syllable";
        chip.dataset.quality = part.quality;
        chip.textContent = part.label;
        chip.style.setProperty("--syllable-color", part.color);
        chip.title = "Score: " + Math.round(part.score * 100) + "%";
        row.appendChild(chip);
      });

      item.appendChild(label);
      item.appendChild(row);
      practiceBreakdownElement.appendChild(item);
    });
  }

  function canStartPractice() {
    return practiceRuntimeInfo.available &&
      isSelectedScenarioUnlocked() &&
      !isPlaying &&
      !isListening &&
      !isPracticeProcessing;
  }

  function buildPracticeStatusText(practiceResult) {
    if (!practiceRuntimeInfo.available) {
      return practiceRuntimeInfo.supportText;
    }

    if (practiceStatusMessage) {
      return practiceStatusMessage;
    }

    if (practiceResult) {
      return practiceResult.message;
    }

    if (currentPlaybackMode === "coaching" && isPlaying) {
      return "Listen to the spoken coaching, then try the phrase again.";
    }

    if (isPracticeProcessing) {
      return "Finishing your answer and scoring it now.";
    }

    if (isPlaying) {
      return "Finish the lesson audio before you start the speaking check.";
    }

    if (!isSelectedScenarioUnlocked()) {
      return "Unlock this lesson to try the speaking check.";
    }

    return practiceRuntimeInfo.preferredProvider === "azure"
      ? "Say the key phrase, tap Finish answer, then listen to the spoken coaching. Azure highlights words and syllables when available."
      : "Say the key phrase, tap Finish answer, then listen to the spoken coaching while we compare what the browser heard.";
  }

  function buildPracticeBadgeText(practiceResult) {
    if (!practiceRuntimeInfo.available) {
      return "Unavailable";
    }

    if (currentPlaybackMode === "coaching" && isPlaying) {
      return "Coaching";
    }

    if (isPracticeProcessing) {
      return "Scoring";
    }

    if (isListening) {
      return "Listening";
    }

    if (practiceResult) {
      return practiceResult.ratingLabel;
    }

    return practiceRuntimeInfo.preferredProvider === "azure" ? "Azure Ready" : "Browser Ready";
  }

  function buildPracticeBadgeState(practiceResult) {
    if (!practiceRuntimeInfo.available) {
      return "unavailable";
    }

    if (currentPlaybackMode === "coaching" && isPlaying) {
      return "coaching";
    }

    if (isPracticeProcessing) {
      return "processing";
    }

    if (isListening) {
      return "listening";
    }

    if (practiceResult) {
      return practiceResult.ratingKey;
    }

    return practiceRuntimeInfo.preferredProvider === "azure" ? "azure-ready" : "browser-ready";
  }

  function qualityFromScore(score) {
    if (score >= 0.85) {
      return "strong";
    }

    if (score >= 0.65) {
      return "good";
    }

    if (score >= 0.4) {
      return "partial";
    }

    return "weak";
  }

  function labelForPhase(phase) {
    switch (phase) {
      case "dialogue":
        return "Playing dialogue";
      case "narration":
        return "Playing cultural tip";
      case "key_phrase":
        return "Repeating key phrase";
      case "reflection":
        return "Playing reflection question";
      default:
        return "Waiting to start";
    }
  }

  function setStatus(message, isError) {
    statusPillElement.textContent = message;
    statusPillElement.style.borderColor = isError ? "#d56a57" : "";
    statusPillElement.style.background = isError ? "#fbe5e0" : "";
    statusPillElement.style.color = isError ? "#8f301f" : "";
  }
})();






