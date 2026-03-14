(function () {
  const storageKey = "carevoice-demo-completed";
  const segmentOrder = ["dialogue", "narration", "key_phrase", "reflection"];

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

  const scenarios = globalThis.CareVoiceScenarios.scenarios;
  const pipeline = globalThis.CareVoicePipeline.createSpeechPipeline();

  let selectedScenarioId = scenarios[0].id;
  let completedScenarioIds = normalizeCompletedScenarioIds(loadCompletedScenarioIds());
  let activePhase = "";
  let completedPhases = [];
  let readyToComplete = false;
  let isPlaying = false;
  let currentPlaybackMode = "idle";

  ensureSelectedScenarioIsUnlocked();
  renderScenarioCards();
  renderSelectedScenario();
  renderSegmentList();
  hydrateVoices();
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

    startFullPlayback();
  });

  actionButton.addEventListener("click", function () {
    if (isPlaying) {
      stopPlayback();
      return;
    }

    if (readyToComplete) {
      startReflectionReplay();
    }
  });

  completeButton.addEventListener("click", function () {
    if (!readyToComplete) {
      return;
    }

    const scenario = getSelectedScenario();

    markScenarioComplete(scenario.id);

    readyToComplete = false;
    isPlaying = false;
    currentPlaybackMode = "idle";
    activePhase = "";
    completedPhases = [];
    selectNextScenarioAfterCompletion();
    renderScenarioCards();
    renderSelectedScenario();
    renderSegmentList();
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
    completedScenarioIds = [];
    persistCompletedScenarioIds();
    selectedScenarioId = scenarios[0].id;
    readyToComplete = false;
    isPlaying = false;
    currentPlaybackMode = "idle";
    activePhase = "";
    completedPhases = [];
    renderScenarioCards();
    renderSelectedScenario();
    renderSegmentList();
    syncControls("idle");
    phaseChipElement.textContent = "Waiting to start";
    setStatus("Demo progress reset.", false);
  });

  voiceSelect.addEventListener("change", function () {
    pipeline.setPreferredVoiceName(voiceSelect.value);
    setStatus("Voice updated.", false);
  });

  function startFullPlayback() {
    const scenario = getSelectedScenario();

    readyToComplete = false;
    isPlaying = true;
    currentPlaybackMode = "full";
    activePhase = "";
    completedPhases = [];
    renderSegmentList();
    renderScenarioCards();
    syncControls("playing");
    setStatus("Playing " + scenario.title + ".", false);
    phaseChipElement.textContent = "Starting lesson";

    pipeline.playScenario(scenario, buildPlaybackCallbacks("full")).catch(handlePlaybackError);
  }

  function startReflectionReplay() {
    const scenario = getSelectedScenario();

    readyToComplete = false;
    isPlaying = true;
    currentPlaybackMode = "reflection";
    activePhase = "";
    completedPhases = ["dialogue", "narration", "key_phrase"];
    renderSegmentList();
    renderScenarioCards();
    syncControls("playing");
    setStatus("Replaying the reflection question.", false);
    phaseChipElement.textContent = "Replaying reflection";

    pipeline.playReflectionQuestion(scenario, buildPlaybackCallbacks("reflection")).catch(handlePlaybackError);
  }

  function stopPlayback() {
    const stoppedMode = currentPlaybackMode;

    pipeline.stop();
    isPlaying = false;
    currentPlaybackMode = "idle";
    activePhase = "";

    if (stoppedMode === "reflection") {
      readyToComplete = true;
      completedPhases = segmentOrder.slice();
      renderSegmentList();
      renderScenarioCards();
      syncControls("ready");
      phaseChipElement.textContent = "Reflection replay stopped";
      setStatus("Reflection replay stopped. Tap Hear Again or I Understood.", false);
      return;
    }

    readyToComplete = false;
    completedPhases = [];
    renderSegmentList();
    renderScenarioCards();
    syncControls("idle");
    phaseChipElement.textContent = "Stopped";
    setStatus("Playback stopped.", false);
  }

  function buildPlaybackCallbacks(mode) {
    return {
      onSegmentStart: function (event) {
        activePhase = event.phase;

        if (mode === "reflection") {
          completedPhases = ["dialogue", "narration", "key_phrase"];
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
          phaseChipElement.textContent = mode === "full" ? "Lesson finished" : "Reflection replay finished";
          setStatus(
            mode === "full"
              ? "Lesson finished. Tap I Understood or Hear Again."
              : "Reflection replayed. Tap I Understood or Hear Again.",
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
        syncControls("ready");
      }
    };
  }

  function handlePlaybackError(error) {
    const failedMode = currentPlaybackMode;

    isPlaying = false;
    currentPlaybackMode = "idle";
    activePhase = "";

    if (failedMode === "reflection") {
      readyToComplete = true;
      completedPhases = segmentOrder.slice();
      renderSegmentList();
      renderScenarioCards();
      syncControls("ready");
      phaseChipElement.textContent = "Reflection replay failed";
      setStatus("Reflection replay failed. Tap Hear Again or I Understood.", true);
      return;
    }

    readyToComplete = false;
    completedPhases = [];
    renderSegmentList();
    renderScenarioCards();
    syncControls("idle");
    phaseChipElement.textContent = "Playback failed";
    setStatus(error.message, true);
  }

  function syncControls(mode) {
    playButton.disabled = mode === "playing" || !isSelectedScenarioUnlocked();
    actionButton.disabled = mode === "idle";
    actionButton.textContent = mode === "ready" ? "Hear Again" : "Stop";
    completeButton.disabled = mode !== "ready";
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
      button.disabled = !unlocked || isPlaying;
      button.innerHTML = [
        "<h3>" + scenario.title + "</h3>",
        "<p>" + scenario.context + "</p>",
        "<div class=\"scenario-meta\">",
        "<span>" + scenario.dialogue.length + " dialogue turns</span>",
        "<span class=\"scenario-tag\" data-done=\"" + String(done) + "\">" + tagLabel + "</span>",
        "</div>"
      ].join("");

      if (unlocked && !isPlaying) {
        button.addEventListener("click", function () {
          selectedScenarioId = scenario.id;
          readyToComplete = false;
          currentPlaybackMode = "idle";
          activePhase = "";
          completedPhases = [];
          renderScenarioCards();
          renderSelectedScenario();
          renderSegmentList();
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

    segmentListElement.innerHTML = "";

    segments.forEach(function (segment) {
      const item = document.createElement("li");
      item.className = "segment-item";
      item.dataset.active = String(segment.id === activePhase);
      item.dataset.done = String(completedPhases.indexOf(segment.id) !== -1);
      item.innerHTML = [
        "<span class=\"segment-label\">" + segment.label + "</span>",
        "<span class=\"segment-text\">" + segment.text + "</span>"
      ].join("");
      segmentListElement.appendChild(item);
    });
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
