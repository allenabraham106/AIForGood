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
  const stopButton = document.querySelector("[data-stop-button]");
  const completeButton = document.querySelector("[data-complete-button]");
  const hearAgainButton = document.querySelector("[data-hear-again-button]");
  const resetProgressButton = document.querySelector("[data-reset-progress]");
  const voiceSelect = document.querySelector("[data-voice-select]");

  const scenarios = globalThis.CareVoiceScenarios.scenarios;
  const pipeline = globalThis.CareVoicePipeline.createSpeechPipeline();

  let selectedScenarioId = scenarios[0].id;
  let completedScenarioIds = loadCompletedScenarioIds();
  let activePhase = "";
  let readyToComplete = false;
  let lastPlayedScenarioWithReflection = null;

  renderScenarioCards();
  renderSelectedScenario();
  renderSegmentList();
  hydrateVoices();

  if (!globalThis.CareVoicePipeline.supportsSpeechSynthesis()) {
    setStatus("Speech synthesis is not supported in this browser.", true);
    playButton.disabled = true;
    voiceSelect.disabled = true;
  }

  playButton.addEventListener("click", function () {
    const scenario = getSelectedScenario();
    readyToComplete = false;
    completeButton.disabled = true;
    hearAgainButton.disabled = true;
    stopButton.disabled = false;
    playButton.disabled = true;
    activePhase = "";
    renderSegmentList();
    setStatus("Playing " + scenario.title + ".", false);
    phaseChipElement.textContent = "Starting lesson";

    fetchReflectionThenPlay(scenario);
  });

  function fetchReflectionThenPlay(scenario) {
    const promptContext = globalThis.CareVoiceScenarios.buildReflectionPromptContext(scenario);
    const apiUrl = "/api/reflection-question";
    const controller = new AbortController();
    const timeoutId = setTimeout(function () {
      controller.abort();
    }, 5000);

    fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promptContext: promptContext }),
      signal: controller.signal
    })
      .then(function (res) {
        clearTimeout(timeoutId);
        if (!res.ok) {
          throw new Error("API " + res.status);
        }
        return res.json();
      })
      .then(function (data) {
        if (data && typeof data.question === "string" && data.question.trim()) {
          scenario = Object.assign({}, scenario, { reflectionQuestion: data.question.trim() });
        }
        lastPlayedScenarioWithReflection = scenario;
        runPlayScenario(scenario);
      })
      .catch(function () {
        clearTimeout(timeoutId);
        lastPlayedScenarioWithReflection = scenario;
        runPlayScenario(scenario);
      });
  }

  function runPlayScenario(scenario) {
    pipeline.playScenario(scenario, {
      onSegmentStart: function (event) {
        activePhase = event.phase;
        renderSegmentList();
      },
      onStateChange: function (event) {
        if (event.status === "playing") {
          phaseChipElement.textContent = labelForPhase(event.phase);
        }

        if (event.status === "complete") {
          phaseChipElement.textContent = "Lesson finished";
          setStatus("Lesson finished. Tap Got it to mark completion.", false);
        }
      },
      onComplete: function () {
        readyToComplete = true;
        playButton.disabled = false;
        stopButton.disabled = true;
        completeButton.disabled = false;
        hearAgainButton.disabled = false;
        activePhase = "";
        renderSegmentList();
      }
    }).catch(function (error) {
      playButton.disabled = false;
      stopButton.disabled = true;
      completeButton.disabled = true;
      hearAgainButton.disabled = true;
      activePhase = "";
      renderSegmentList();
      phaseChipElement.textContent = "Playback failed";
      setStatus(error.message, true);
    });
  }

  hearAgainButton.addEventListener("click", function () {
    if (!lastPlayedScenarioWithReflection) return;
    hearAgainButton.disabled = true;
    setStatus("Playing reflection question again.", false);
    phaseChipElement.textContent = "Playing reflection question";
    pipeline.playReflectionOnly(lastPlayedScenarioWithReflection, {
      onComplete: function () {
        hearAgainButton.disabled = false;
        phaseChipElement.textContent = "Lesson finished";
        setStatus("Lesson finished. Tap Got it to mark completion.", false);
      }
    }).catch(function () {
      hearAgainButton.disabled = false;
      setStatus("Playback failed.", true);
    });
  });

  stopButton.addEventListener("click", function () {
    pipeline.stop();
    activePhase = "";
    renderSegmentList();
    playButton.disabled = false;
    stopButton.disabled = true;
    completeButton.disabled = !readyToComplete;
    hearAgainButton.disabled = true;
    phaseChipElement.textContent = "Stopped";
    setStatus("Playback stopped.", false);
  });

  completeButton.addEventListener("click", function () {
    const scenario = getSelectedScenario();
    markScenarioComplete(scenario.id);
    readyToComplete = false;
    completeButton.disabled = true;
    hearAgainButton.disabled = true;
    phaseChipElement.textContent = "Completion sent";
    setStatus("Scenario marked complete. Replace this with Person 2's markComplete call.", false);
  });

  resetProgressButton.addEventListener("click", function () {
    completedScenarioIds = [];
    persistCompletedScenarioIds();
    renderScenarioCards();
    renderSelectedScenario();
    setStatus("Demo progress reset.", false);
  });

  voiceSelect.addEventListener("change", function () {
    pipeline.setPreferredVoiceName(voiceSelect.value);
    setStatus("Voice updated.", false);
  });

  function loadCompletedScenarioIds() {
    try {
      const raw = globalThis.localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      return [];
    }
  }

  function persistCompletedScenarioIds() {
    globalThis.localStorage.setItem(storageKey, JSON.stringify(completedScenarioIds));
  }

  function getSelectedScenario() {
    return globalThis.CareVoiceScenarios.findScenarioById(selectedScenarioId);
  }

  function markScenarioComplete(scenarioId) {
    if (completedScenarioIds.indexOf(scenarioId) === -1) {
      completedScenarioIds = completedScenarioIds.concat(scenarioId);
      persistCompletedScenarioIds();
    }

    renderScenarioCards();
    renderSelectedScenario();
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
    scenarioListElement.innerHTML = "";

    scenarios.forEach(function (scenario) {
      const button = document.createElement("button");
      const done = completedScenarioIds.indexOf(scenario.id) !== -1;

      button.type = "button";
      button.className = "scenario-card";
      button.dataset.selected = String(scenario.id === selectedScenarioId);
      button.innerHTML = [
        "<h3>" + scenario.title + "</h3>",
        "<p>" + scenario.context + "</p>",
        "<div class=\"scenario-meta\">",
        "<span>" + scenario.dialogue.length + " dialogue turns</span>",
        "<span class=\"scenario-tag\" data-done=\"" + String(done) + "\">" + (done ? "Completed" : "Ready") + "</span>",
        "</div>"
      ].join("");

      button.addEventListener("click", function () {
        selectedScenarioId = scenario.id;
        readyToComplete = false;
        completeButton.disabled = true;
        activePhase = "";
        playButton.disabled = false;
        stopButton.disabled = true;
        setStatus("Selected " + scenario.title + ".", false);
        phaseChipElement.textContent = "Waiting to start";
        renderScenarioCards();
        renderSelectedScenario();
        renderSegmentList();
      });

      scenarioListElement.appendChild(button);
    });
  }

  function renderSelectedScenario() {
    const scenario = getSelectedScenario();
    const done = completedScenarioIds.indexOf(scenario.id) !== -1;

    titleElement.textContent = scenario.title;
    contextElement.textContent = scenario.context;
    completionChipElement.dataset.complete = String(done);
    completionChipElement.textContent = done ? "Completed in demo" : "Not completed";
  }

  function renderSegmentList() {
    const scenario = getSelectedScenario();
    const segments = globalThis.CareVoicePipeline.buildSegments(scenario);

    segmentListElement.innerHTML = "";

    segments.forEach(function (segment) {
      const item = document.createElement("li");
      item.className = "segment-item";
      item.dataset.active = String(segment.id === activePhase);
      item.dataset.done = String(segmentOrder.indexOf(segment.id) < segmentOrder.indexOf(activePhase));
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
