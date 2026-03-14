(function (global) {
  const RecognitionConstructor = global.SpeechRecognition || global.webkitSpeechRecognition || null;
  const WORD_PATTERN = /[a-z0-9']+/gi;

  function supportsSpeechRecognition() {
    return typeof RecognitionConstructor === "function";
  }

  function supportsAzureSpeechSDK() {
    return Boolean(global.SpeechSDK && typeof global.fetch === "function");
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function createDeferred() {
    let resolveFn = null;
    let rejectFn = null;
    const promise = new Promise(function (resolve, reject) {
      resolveFn = resolve;
      rejectFn = reject;
    });
    return { promise: promise, resolve: resolveFn, reject: rejectFn };
  }

  function createError(message, code, extra) {
    const error = new Error(message);
    error.code = code || "speech-error";
    if (extra && typeof extra === "object") {
      Object.keys(extra).forEach(function (key) {
        error[key] = extra[key];
      });
    }
    return error;
  }

  function normalizeWhitespace(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function normalizeWord(word) {
    return String(word || "").toLowerCase().replace(/[^a-z0-9']/g, "");
  }

  function tokenizeDetailed(text) {
    const matches = String(text || "").match(WORD_PATTERN) || [];
    return matches.map(function (token) {
      return { display: token, normalized: normalizeWord(token) };
    }).filter(function (token) {
      return token.normalized.length > 0;
    });
  }

  function safeJsonParse(text) {
    try {
      return JSON.parse(text);
    } catch (error) {
      return null;
    }
  }

  function toNumber(value) {
    return typeof value === "number" && !Number.isNaN(value) ? value : null;
  }

  function averageNumbers(values) {
    const numericValues = (Array.isArray(values) ? values : []).filter(function (value) {
      return typeof value === "number" && !Number.isNaN(value);
    });
    if (numericValues.length === 0) {
      return null;
    }
    return numericValues.reduce(function (sum, value) {
      return sum + value;
    }, 0) / numericValues.length;
  }

  function normalizeHundredScore(value) {
    const numericValue = toNumber(value);
    return numericValue === null ? null : clamp(numericValue / 100, 0, 1);
  }

  function mergeTranscripts(finalParts, interimText) {
    return normalizeWhitespace((Array.isArray(finalParts) ? finalParts.join(" ") : "") + " " + String(interimText || ""));
  }

  function levenshteinDistance(a, b) {
    const left = normalizeWord(a);
    const right = normalizeWord(b);
    const rows = left.length + 1;
    const cols = right.length + 1;
    const matrix = new Array(rows);

    for (let row = 0; row < rows; row += 1) {
      matrix[row] = new Array(cols).fill(0);
      matrix[row][0] = row;
    }
    for (let col = 0; col < cols; col += 1) {
      matrix[0][col] = col;
    }
    for (let row = 1; row < rows; row += 1) {
      for (let col = 1; col < cols; col += 1) {
        const cost = left[row - 1] === right[col - 1] ? 0 : 1;
        matrix[row][col] = Math.min(
          matrix[row - 1][col] + 1,
          matrix[row][col - 1] + 1,
          matrix[row - 1][col - 1] + cost
        );
      }
    }
    return matrix[rows - 1][cols - 1];
  }

  function wordSimilarity(leftWord, rightWord) {
    const left = normalizeWord(leftWord);
    const right = normalizeWord(rightWord);
    if (!left || !right) {
      return 0;
    }
    if (left === right) {
      return 1;
    }
    const longestLength = Math.max(left.length, right.length);
    const distance = levenshteinDistance(left, right);
    return clamp(1 - distance / longestLength, 0, 1);
  }

  function buildAlignment(targetTokens, spokenTokens) {
    const gapPenalty = 0.34;
    const matchBias = 0.28;
    const rows = targetTokens.length + 1;
    const cols = spokenTokens.length + 1;
    const scores = new Array(rows);
    const steps = new Array(rows);

    for (let row = 0; row < rows; row += 1) {
      scores[row] = new Array(cols).fill(0);
      steps[row] = new Array(cols).fill("none");
    }
    for (let row = 1; row < rows; row += 1) {
      scores[row][0] = scores[row - 1][0] - gapPenalty;
      steps[row][0] = "up";
    }
    for (let col = 1; col < cols; col += 1) {
      scores[0][col] = scores[0][col - 1] - gapPenalty;
      steps[0][col] = "left";
    }

    for (let row = 1; row < rows; row += 1) {
      for (let col = 1; col < cols; col += 1) {
        const similarity = wordSimilarity(targetTokens[row - 1].normalized, spokenTokens[col - 1].normalized);
        const diagonal = scores[row - 1][col - 1] + similarity - matchBias;
        const up = scores[row - 1][col] - gapPenalty;
        const left = scores[row][col - 1] - gapPenalty;
        let bestScore = diagonal;
        let bestStep = "diag";
        if (up > bestScore) {
          bestScore = up;
          bestStep = "up";
        }
        if (left > bestScore) {
          bestScore = left;
          bestStep = "left";
        }
        scores[row][col] = bestScore;
        steps[row][col] = bestStep;
      }
    }

    const alignedResults = new Array(targetTokens.length);
    let row = targetTokens.length;
    let col = spokenTokens.length;

    while (row > 0 || col > 0) {
      const step = steps[row][col];
      if (step === "diag" && row > 0 && col > 0) {
        const targetToken = targetTokens[row - 1];
        const spokenToken = spokenTokens[col - 1];
        alignedResults[row - 1] = {
          targetWord: targetToken.display,
          normalizedTargetWord: targetToken.normalized,
          matchedWord: spokenToken.display,
          normalizedMatchedWord: spokenToken.normalized,
          score: wordSimilarity(targetToken.normalized, spokenToken.normalized),
          matchedToken: spokenToken
        };
        row -= 1;
        col -= 1;
        continue;
      }
      if (step === "up" && row > 0) {
        const targetToken = targetTokens[row - 1];
        alignedResults[row - 1] = {
          targetWord: targetToken.display,
          normalizedTargetWord: targetToken.normalized,
          matchedWord: "",
          normalizedMatchedWord: "",
          score: 0,
          matchedToken: null
        };
        row -= 1;
        continue;
      }
      if (step === "left" && col > 0) {
        col -= 1;
        continue;
      }
      break;
    }

    return alignedResults.map(function (result, index) {
      return result || {
        targetWord: targetTokens[index].display,
        normalizedTargetWord: targetTokens[index].normalized,
        matchedWord: "",
        normalizedMatchedWord: "",
        score: 0,
        matchedToken: null
      };
    });
  }

  function scoreToColor(score) {
    const hue = Math.round(clamp(score, 0, 1) * 120);
    return "hsl(" + hue + " 72% 78%)";
  }

  function describeWordScore(score) {
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

  function summarizeAttempt(overallScore, providerLabel, details) {
    const extraDetails = details || {};
    if (overallScore >= 0.85) {
      return { overallScore: overallScore, ratingKey: "strong", ratingLabel: "Strong Match", message: providerLabel + " heard the phrase clearly." };
    }
    if (overallScore >= 0.65) {
      return {
        overallScore: overallScore,
        ratingKey: "good",
        ratingLabel: "Good Match",
        message: extraDetails.hasSubwordFeedback ? "Good start. Focus on the red word and sound chips first." : "Good start. Focus on the red words first."
      };
    }
    return {
      overallScore: overallScore,
      ratingKey: "try-again",
      ratingLabel: "Try Again",
      message: extraDetails.hasSubwordFeedback ? "Try again slowly. Focus on the red word and sound chips." : "Try again slowly. Focus on the red word first."
    };
  }

  function finalizeWordResults(alignedWords, mapper) {
    return alignedWords.map(function (wordResult) {
      const mappedResult = mapper(wordResult);
      const score = clamp(mappedResult.score, 0, 1);
      return Object.assign({}, mappedResult, {
        score: score,
        color: scoreToColor(score),
        quality: describeWordScore(score)
      });
    });
  }

  function scoreTranscriptAttempt(targetText, spokenText, recognitionConfidence, providerDetails) {
    const targetTokens = tokenizeDetailed(targetText);
    const spokenTokens = tokenizeDetailed(spokenText);
    const alignedWords = finalizeWordResults(buildAlignment(targetTokens, spokenTokens), function (wordResult) {
      return Object.assign({}, wordResult, {
        syllables: [],
        phonemes: [],
        errorType: wordResult.matchedWord ? "None" : "Omission"
      });
    });
    const averageWordScore = alignedWords.length === 0 ? 0 : alignedWords.reduce(function (sum, wordResult) {
      return sum + wordResult.score;
    }, 0) / alignedWords.length;
    const strongWordCount = alignedWords.filter(function (wordResult) {
      return wordResult.score >= 0.65;
    }).length;
    const coverageScore = alignedWords.length === 0 ? 0 : strongWordCount / alignedWords.length;
    let overallScore = averageWordScore * 0.82 + coverageScore * 0.18;
    if (typeof recognitionConfidence === "number" && !Number.isNaN(recognitionConfidence)) {
      overallScore = overallScore * 0.9 + clamp(recognitionConfidence, 0, 1) * 0.1;
    }
    overallScore = clamp(overallScore, 0, 1);
    const details = Object.assign({ providerKey: "browser", providerLabel: "Browser Fallback", metricsText: "Browser transcript match only" }, providerDetails || {});
    const summary = summarizeAttempt(overallScore, details.providerLabel, { hasSubwordFeedback: false });
    return {
      providerKey: details.providerKey,
      providerLabel: details.providerLabel,
      targetText: normalizeWhitespace(targetText),
      transcript: normalizeWhitespace(spokenText),
      recognitionConfidence: typeof recognitionConfidence === "number" ? clamp(recognitionConfidence, 0, 1) : null,
      wordResults: alignedWords,
      overallScore: summary.overallScore,
      ratingKey: summary.ratingKey,
      ratingLabel: summary.ratingLabel,
      message: summary.message,
      metricsText: details.metricsText,
      subwordType: "none",
      pronunciationScores: { pronunciation: null, accuracy: null, fluency: null, completeness: null, prosody: null }
    };
  }

  function pickFirstValue(source, keys) {
    const safeSource = source || {};
    for (let index = 0; index < keys.length; index += 1) {
      const value = safeSource[keys[index]];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return value;
      }
    }
    return null;
  }

  function extractPronunciationAssessment(source) {
    if (!source || typeof source !== "object") {
      return {};
    }
    return source.PronunciationAssessment || source.pronunciationAssessment || {};
  }

  function extractAzureTopResult(servicePayload) {
    const parsed = typeof servicePayload === "string" ? safeJsonParse(servicePayload) : servicePayload;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }
    const nBest = Array.isArray(parsed.NBest) ? parsed.NBest : Array.isArray(parsed.nBest) ? parsed.nBest : [];
    return { raw: parsed, best: nBest[0] || {} };
  }

  function buildPartResult(rawPart, labelKeys) {
    const label = pickFirstValue(rawPart, labelKeys);
    if (!label) {
      return null;
    }
    const assessment = extractPronunciationAssessment(rawPart);
    const score = normalizeHundredScore(pickFirstValue(assessment, ["AccuracyScore", "PronScore", "PronunciationScore"]));
    if (score === null) {
      return null;
    }
    return {
      label: String(label),
      score: score,
      color: scoreToColor(score),
      quality: describeWordScore(score)
    };
  }

  function parseAzureParts(items, labelKeys) {
    return (Array.isArray(items) ? items : []).map(function (item) {
      return buildPartResult(item, labelKeys);
    }).filter(Boolean);
  }

  function buildMergedAzureResult(servicePayloads) {
    const parsedResults = (Array.isArray(servicePayloads) ? servicePayloads : []).map(extractAzureTopResult).filter(Boolean);
    if (parsedResults.length === 0) {
      return null;
    }
    const mergedTranscript = normalizeWhitespace(parsedResults.map(function (entry) {
      return pickFirstValue(entry.best, ["Display", "Lexical"]) || pickFirstValue(entry.raw, ["DisplayText"]);
    }).join(" "));
    const mergedWords = parsedResults.reduce(function (collection, entry) {
      const words = Array.isArray(entry.best.Words) ? entry.best.Words : Array.isArray(entry.best.words) ? entry.best.words : [];
      return collection.concat(words);
    }, []);
    const topScores = parsedResults.map(function (entry) {
      return extractPronunciationAssessment(entry.best);
    });
    return {
      DisplayText: mergedTranscript,
      NBest: [{
        Display: mergedTranscript,
        Confidence: averageNumbers(parsedResults.map(function (entry) { return toNumber(entry.best.Confidence); })),
        PronunciationAssessment: {
          AccuracyScore: averageNumbers(topScores.map(function (item) { return toNumber(item.AccuracyScore); })),
          FluencyScore: averageNumbers(topScores.map(function (item) { return toNumber(item.FluencyScore); })),
          CompletenessScore: averageNumbers(topScores.map(function (item) { return toNumber(item.CompletenessScore); })),
          PronScore: averageNumbers(topScores.map(function (item) { return toNumber(item.PronScore || item.PronunciationScore); })),
          ProsodyScore: averageNumbers(topScores.map(function (item) { return toNumber(item.ProsodyScore); }))
        },
        Words: mergedWords
      }]
    };
  }

  function scoreAzureAttempt(targetText, servicePayloads, providerDetails) {
    const mergedResult = buildMergedAzureResult(servicePayloads);
    if (!mergedResult) {
      return scoreTranscriptAttempt(targetText, "", null, providerDetails);
    }

    const best = mergedResult.NBest[0] || {};
    const transcript = normalizeWhitespace(pickFirstValue(best, ["Display", "Lexical"]) || pickFirstValue(mergedResult, ["DisplayText"]) || "");
    const targetTokens = tokenizeDetailed(targetText);
    const rawWords = Array.isArray(best.Words) ? best.Words : Array.isArray(best.words) ? best.words : [];
    const spokenTokens = rawWords.map(function (word) {
      const display = String(pickFirstValue(word, ["Word", "word"]) || "").trim();
      return { display: display, normalized: normalizeWord(display), raw: word };
    }).filter(function (token) {
      return token.normalized.length > 0;
    });

    const alignedWords = finalizeWordResults(buildAlignment(targetTokens, spokenTokens), function (wordResult) {
      const rawWord = wordResult.matchedToken && wordResult.matchedToken.raw ? wordResult.matchedToken.raw : null;
      const assessment = extractPronunciationAssessment(rawWord);
      const azureWordScore = normalizeHundredScore(pickFirstValue(assessment, ["AccuracyScore", "PronScore", "PronunciationScore"]));
      const blendedScore = wordResult.matchedWord ? (azureWordScore === null ? wordResult.score : clamp(wordResult.score * 0.35 + azureWordScore * 0.65, 0, 1)) : 0;
      return Object.assign({}, wordResult, {
        score: blendedScore,
        syllables: parseAzureParts(rawWord && rawWord.Syllables, ["Syllable", "syllable"]),
        phonemes: parseAzureParts(rawWord && rawWord.Phonemes, ["Phoneme", "phoneme"]),
        errorType: pickFirstValue(assessment, ["ErrorType"]) || (wordResult.matchedWord ? "None" : "Omission")
      });
    });

    const topAssessment = extractPronunciationAssessment(best);
    const pronunciationScores = {
      pronunciation: normalizeHundredScore(pickFirstValue(topAssessment, ["PronScore", "PronunciationScore"])),
      accuracy: normalizeHundredScore(topAssessment.AccuracyScore),
      fluency: normalizeHundredScore(topAssessment.FluencyScore),
      completeness: normalizeHundredScore(topAssessment.CompletenessScore),
      prosody: normalizeHundredScore(topAssessment.ProsodyScore)
    };
    const fallbackWordAverage = averageNumbers(alignedWords.map(function (wordResult) {
      return wordResult.score;
    })) || 0;
    const overallScore = clamp(
      pronunciationScores.pronunciation !== null
        ? pronunciationScores.pronunciation
        : averageNumbers([
            pronunciationScores.accuracy,
            pronunciationScores.fluency,
            pronunciationScores.completeness,
            pronunciationScores.prosody
          ]) || fallbackWordAverage,
      0,
      1
    );
    const hasSyllables = alignedWords.some(function (wordResult) { return wordResult.syllables.length > 0; });
    const hasPhonemes = alignedWords.some(function (wordResult) { return wordResult.phonemes.length > 0; });
    const providerLabel = providerDetails && providerDetails.providerLabel ? providerDetails.providerLabel : "Azure Pronunciation";
    const summary = summarizeAttempt(overallScore, providerLabel, { hasSubwordFeedback: hasSyllables || hasPhonemes });

    return {
      providerKey: providerDetails && providerDetails.providerKey ? providerDetails.providerKey : "azure",
      providerLabel: providerLabel,
      targetText: normalizeWhitespace(targetText),
      transcript: transcript,
      recognitionConfidence: normalizeHundredScore(best.Confidence),
      wordResults: alignedWords,
      overallScore: summary.overallScore,
      ratingKey: summary.ratingKey,
      ratingLabel: summary.ratingLabel,
      message: summary.message,
      metricsText: hasSyllables ? "Azure word and syllable scoring" : hasPhonemes ? "Azure word and sound scoring" : "Azure word scoring",
      subwordType: hasSyllables ? "syllables" : hasPhonemes ? "phonemes" : "none",
      pronunciationScores: pronunciationScores
    };
  }

  function getWeakWordResults(analysis, maxCount) {
    const safeAnalysis = analysis || {};
    const limit = typeof maxCount === "number" && maxCount > 0 ? maxCount : 2;
    return (Array.isArray(safeAnalysis.wordResults) ? safeAnalysis.wordResults : []).filter(function (wordResult) {
      return typeof wordResult.score === "number" && wordResult.score < 0.7;
    }).sort(function (left, right) {
      return left.score - right.score;
    }).slice(0, limit);
  }

  function buildVoiceCoachingPlan(analysis, options) {
    const safeAnalysis = analysis || {};
    const safeOptions = Object.assign({ maxWords: 2 }, options || {});
    const weakWords = getWeakWordResults(safeAnalysis, safeOptions.maxWords);
    if (!safeAnalysis.targetText) {
      return [];
    }
    if (weakWords.length === 0) {
      return [
        { id: "coach-praise", label: "Voice Coaching", text: "Nice work. That sounded clear.", rate: 0.82, pauseMs: 700 },
        { id: "coach-phrase", label: "Voice Coaching", text: "Say the full phrase one more time. " + safeAnalysis.targetText, rate: 0.78, pauseMs: 0 }
      ];
    }
    const items = [
      { id: "coach-summary", label: "Voice Coaching", text: "Good start. Let us practice one word at a time.", rate: 0.82, pauseMs: 650 }
    ];
    weakWords.forEach(function (wordResult, index) {
      items.push(
        { id: "coach-word-intro-" + index, label: "Voice Coaching", text: "Try this word again.", rate: 0.8, pauseMs: 400 },
        { id: "coach-word-" + index, label: "Voice Coaching", text: wordResult.targetWord, rate: 0.68, pauseMs: 500 }
      );
    });
    items.push({ id: "coach-retry", label: "Voice Coaching", text: "Now try the whole phrase again. " + safeAnalysis.targetText, rate: 0.78, pauseMs: 0 });
    return items;
  }

  function getAzureJsonPropertyId() {
    return global.SpeechSDK && global.SpeechSDK.PropertyId && global.SpeechSDK.PropertyId.SpeechServiceResponse_JsonResult
      ? global.SpeechSDK.PropertyId.SpeechServiceResponse_JsonResult
      : null;
  }

  function extractTranscriptFromSpeechSdkResult(result) {
    if (!result) {
      return "";
    }
    return normalizeWhitespace(result.text || result.privText || pickFirstValue(result, ["Text", "DisplayText"]) || "");
  }

  function extractAzureJsonFromSpeechSdkResult(result) {
    if (!result) {
      return "";
    }
    const propertyId = getAzureJsonPropertyId();
    if (propertyId && result.properties && typeof result.properties.getProperty === "function") {
      return result.properties.getProperty(propertyId) || "";
    }
    return result.json || result.privJson || "";
  }

  function fetchJson(url) {
    return global.fetch(url, { cache: "no-store" }).then(function (response) {
      return response.text().then(function (body) {
        const payload = body ? safeJsonParse(body) : null;
        if (!response.ok) {
          throw createError(payload && payload.error ? payload.error : "Request failed.", "http-error", {
            status: response.status,
            details: payload && payload.details ? payload.details : body
          });
        }
        return payload || {};
      });
    });
  }

  function fetchAzureConfig() {
    return fetchJson("/api/azure-speech-config").catch(function () {
      return { enabled: false, region: null, language: "en-US", enableProsody: false };
    });
  }

  function fetchAzureToken() {
    return fetchJson("/api/azure-speech-token");
  }

  function createSpeechPractice(options) {
    const settings = Object.assign({ lang: "en-CA" }, options || {});
    let activeAttempt = null;
    let queuedStopOptions = null;

    function clearActiveAttempt(attempt) {
      if (activeAttempt === attempt) {
        activeAttempt = null;
      }
    }

    function wrapAttemptLifecycle(attempt) {
      activeAttempt = attempt;
      if (queuedStopOptions) {
        const pendingStop = queuedStopOptions;
        queuedStopOptions = null;
        global.setTimeout(function () {
          if (activeAttempt === attempt) {
            attempt.stop(pendingStop);
          }
        }, 0);
      }
      return attempt.promise.finally(function () {
        clearActiveAttempt(attempt);
      });
    }

    function getRuntimeInfo() {
      return fetchAzureConfig().then(function (azureConfig) {
        if (azureConfig.enabled && supportsAzureSpeechSDK()) {
          return {
            available: true,
            preferredProvider: "azure",
            label: "Azure Pronunciation",
            supportText: "Azure pronunciation scoring is ready."
          };
        }
        if (supportsSpeechRecognition()) {
          return {
            available: true,
            preferredProvider: "browser",
            label: "Browser Fallback",
            supportText: azureConfig.enabled
              ? "Azure is configured, but the browser Azure SDK is not ready. Using browser speech matching."
              : "Azure is not configured, so the app will use browser speech matching."
          };
        }
        return {
          available: false,
          preferredProvider: "none",
          label: "Unavailable",
          supportText: "Speech intake is not available in this browser."
        };
      });
    }

    function startBrowserAttempt(targetText, callbacks) {
      const safeCallbacks = callbacks || {};
      const deferred = createDeferred();
      const recognition = new RecognitionConstructor();
      const finalParts = [];
      let interimTranscript = "";
      let bestConfidence = null;
      let settled = false;
      let stopMode = "auto";

      function finishWithError(error) {
        if (settled) {
          return;
        }
        settled = true;
        deferred.reject(error);
      }

      function finishWithScore() {
        if (settled) {
          return;
        }
        settled = true;
        const combinedTranscript = mergeTranscripts(finalParts, interimTranscript);
        if (!combinedTranscript) {
          deferred.reject(createError("We did not hear enough speech. Try the key phrase again.", "no-speech"));
          return;
        }
        if (safeCallbacks.onStateChange) {
          safeCallbacks.onStateChange({ status: "processing", provider: "browser" });
        }
        deferred.resolve(scoreTranscriptAttempt(targetText, combinedTranscript, bestConfidence, {
          providerKey: "browser",
          providerLabel: "Browser Fallback",
          metricsText: "Browser transcript match only"
        }));
      }

      recognition.lang = settings.lang || "en-CA";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = function () {
        if (safeCallbacks.onStateChange) {
          safeCallbacks.onStateChange({ status: "listening", provider: "browser" });
        }
      };

      recognition.onresult = function (event) {
        interimTranscript = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const transcript = normalizeWhitespace(result[0] && result[0].transcript ? result[0].transcript : "");
          if (typeof result[0] !== "undefined" && typeof result[0].confidence === "number") {
            bestConfidence = bestConfidence === null ? result[0].confidence : Math.max(bestConfidence, result[0].confidence);
          }
          if (!transcript) {
            continue;
          }
          if (result.isFinal) {
            finalParts.push(transcript);
          } else {
            interimTranscript = transcript;
          }
        }
        if (safeCallbacks.onInterim) {
          safeCallbacks.onInterim({ transcript: mergeTranscripts(finalParts, interimTranscript) });
        }
      };

      recognition.onerror = function (event) {
        const errorCode = event && event.error ? event.error : "speech-error";
        if (stopMode === "discard" && (errorCode === "aborted" || errorCode === "no-speech")) {
          finishWithError(createError("Listening stopped.", "stopped"));
          return;
        }
        if (errorCode === "no-speech") {
          return;
        }
        if (errorCode === "not-allowed" || errorCode === "service-not-allowed") {
          finishWithError(createError("Microphone access was blocked. Allow the microphone and try again.", errorCode));
          return;
        }
        finishWithError(createError("Speech intake stopped unexpectedly. Please try again.", errorCode));
      };

      recognition.onend = function () {
        if (stopMode === "discard") {
          finishWithError(createError("Listening stopped.", "stopped"));
          return;
        }
        finishWithScore();
      };

      try {
        recognition.start();
      } catch (error) {
        finishWithError(createError(error.message || "Could not start the browser speech recognizer.", "browser-start"));
      }

      return {
        promise: deferred.promise,
        stop: function (stopOptions) {
          const safeStopOptions = stopOptions || {};
          if (settled) {
            return;
          }
          if (safeStopOptions.discard) {
            stopMode = "discard";
            try {
              recognition.abort();
            } catch (error) {
              finishWithError(createError("Listening stopped.", "stopped"));
            }
            return;
          }
          stopMode = "finalize";
          if (safeCallbacks.onStateChange) {
            safeCallbacks.onStateChange({ status: "finalizing", provider: "browser" });
          }
          try {
            recognition.stop();
          } catch (error) {
            finishWithScore();
          }
        }
      };
    }

    function startAzureAttempt(targetText, callbacks) {
      const safeCallbacks = callbacks || {};
      return fetchAzureToken().then(function (tokenInfo) {
        const SpeechSDK = global.SpeechSDK;
        const deferred = createDeferred();
        const finalParts = [];
        const servicePayloads = [];
        let interimTranscript = "";
        let settled = false;
        let stopMode = "auto";

        const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(tokenInfo.token, tokenInfo.region);
        const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
        const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
        const assessmentConfig = new SpeechSDK.PronunciationAssessmentConfig(
          normalizeWhitespace(targetText),
          SpeechSDK.PronunciationAssessmentGradingSystem ? SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark : undefined,
          SpeechSDK.PronunciationAssessmentGranularity ? SpeechSDK.PronunciationAssessmentGranularity.Phoneme : undefined,
          true
        );

        function finishWithError(error) {
          if (settled) {
            return;
          }
          settled = true;
          recognizer.close();
          deferred.reject(error);
        }

        function finishWithScore() {
          if (settled) {
            return;
          }
          settled = true;
          recognizer.close();
          if (servicePayloads.length > 0) {
            if (safeCallbacks.onStateChange) {
              safeCallbacks.onStateChange({ status: "processing", provider: "azure" });
            }
            deferred.resolve(scoreAzureAttempt(targetText, servicePayloads, {
              providerKey: "azure",
              providerLabel: "Azure Pronunciation"
            }));
            return;
          }
          const combinedTranscript = mergeTranscripts(finalParts, interimTranscript);
          if (!combinedTranscript) {
            deferred.reject(createError("We did not hear enough speech. Try the key phrase again.", "no-speech"));
            return;
          }
          if (safeCallbacks.onStateChange) {
            safeCallbacks.onStateChange({ status: "processing", provider: "azure" });
          }
          deferred.resolve(scoreTranscriptAttempt(targetText, combinedTranscript, null, {
            providerKey: "azure-transcript",
            providerLabel: "Azure Transcript",
            metricsText: "Azure transcript match only"
          }));
        }

        speechConfig.speechRecognitionLanguage = tokenInfo.language || "en-US";
        if (typeof speechConfig.requestWordLevelTimestamps === "function") {
          speechConfig.requestWordLevelTimestamps();
        }
        if (SpeechSDK.OutputFormat) {
          speechConfig.outputFormat = SpeechSDK.OutputFormat.Detailed;
        }
        if (typeof assessmentConfig.applyTo === "function") {
          assessmentConfig.applyTo(recognizer);
        }
        if (tokenInfo.enableProsody) {
          if (typeof assessmentConfig.enableProsodyAssessment === "function") {
            assessmentConfig.enableProsodyAssessment();
          } else if ("enableProsodyAssessment" in assessmentConfig) {
            assessmentConfig.enableProsodyAssessment = true;
          }
        }
        if ("enableMiscue" in assessmentConfig) {
          assessmentConfig.enableMiscue = true;
        }

        recognizer.recognizing = function (_sender, event) {
          const transcript = extractTranscriptFromSpeechSdkResult(event && event.result);
          if (!transcript) {
            return;
          }
          interimTranscript = transcript;
          if (safeCallbacks.onInterim) {
            safeCallbacks.onInterim({ transcript: mergeTranscripts(finalParts, interimTranscript) });
          }
        };

        recognizer.recognized = function (_sender, event) {
          const result = event && event.result ? event.result : null;
          if (!result || result.reason !== SpeechSDK.ResultReason.RecognizedSpeech) {
            return;
          }
          const transcript = extractTranscriptFromSpeechSdkResult(result);
          const jsonPayload = extractAzureJsonFromSpeechSdkResult(result);
          if (transcript) {
            finalParts.push(transcript);
            interimTranscript = "";
          }
          if (jsonPayload) {
            servicePayloads.push(jsonPayload);
          }
        };

        recognizer.canceled = function (_sender, event) {
          if (stopMode === "discard") {
            finishWithError(createError("Listening stopped.", "stopped"));
            return;
          }
          if (servicePayloads.length > 0 || mergeTranscripts(finalParts, interimTranscript)) {
            finishWithScore();
            return;
          }
          finishWithError(createError(event && event.errorDetails ? event.errorDetails : "Azure canceled the pronunciation check.", "azure-canceled"));
        };

        recognizer.sessionStopped = function () {
          if (stopMode === "discard") {
            finishWithError(createError("Listening stopped.", "stopped"));
            return;
          }
          finishWithScore();
        };

        return new Promise(function (resolve, reject) {
          recognizer.startContinuousRecognitionAsync(function () {
            if (safeCallbacks.onStateChange) {
              safeCallbacks.onStateChange({ status: "listening", provider: "azure" });
            }
            resolve({
              promise: deferred.promise,
              stop: function (stopOptions) {
                const safeStopOptions = stopOptions || {};
                if (settled) {
                  return;
                }
                if (safeStopOptions.discard) {
                  stopMode = "discard";
                  recognizer.stopContinuousRecognitionAsync(function () {
                    finishWithError(createError("Listening stopped.", "stopped"));
                  }, function () {
                    finishWithError(createError("Listening stopped.", "stopped"));
                  });
                  return;
                }
                stopMode = "finalize";
                if (safeCallbacks.onStateChange) {
                  safeCallbacks.onStateChange({ status: "finalizing", provider: "azure" });
                }
                recognizer.stopContinuousRecognitionAsync(function () {}, function () {
                  finishWithScore();
                });
              }
            });
          }, function (error) {
            reject(createError(error && error.message ? error.message : "Could not start Azure pronunciation assessment.", "azure-start"));
          });
        });
      });
    }

    function listenForPhrase(targetText, callbacks) {
      const normalizedTargetText = normalizeWhitespace(targetText);
      const safeCallbacks = callbacks || {};
      stop({ discard: true });
      return getRuntimeInfo().then(function (runtimeInfo) {
        if (!runtimeInfo.available) {
          throw createError(runtimeInfo.supportText, "unavailable");
        }
        if (runtimeInfo.preferredProvider === "azure") {
          return startAzureAttempt(normalizedTargetText, safeCallbacks).catch(function (error) {
            if (!supportsSpeechRecognition()) {
              throw error;
            }
            if (safeCallbacks.onStateChange) {
              safeCallbacks.onStateChange({ status: "fallback", provider: "browser", message: "Azure was not ready, so the app switched to the browser speaking check." });
            }
            return startBrowserAttempt(normalizedTargetText, safeCallbacks);
          });
        }
        return startBrowserAttempt(normalizedTargetText, safeCallbacks);
      }).then(function (attempt) {
        return wrapAttemptLifecycle(attempt);
      });
    }

    function stop(stopOptions) {
      const safeStopOptions = stopOptions || {};
      if (!activeAttempt) {
        queuedStopOptions = safeStopOptions;
        return;
      }
      activeAttempt.stop(safeStopOptions);
    }

    return {
      getRuntimeInfo: getRuntimeInfo,
      listenForPhrase: listenForPhrase,
      stop: stop
    };
  }

  global.CareVoicePractice = {
    supportsSpeechRecognition: supportsSpeechRecognition,
    supportsAzureSpeechSDK: supportsAzureSpeechSDK,
    tokenizeDetailed: tokenizeDetailed,
    scoreTranscriptAttempt: scoreTranscriptAttempt,
    buildMergedAzureResult: buildMergedAzureResult,
    scoreAzureAttempt: scoreAzureAttempt,
    getWeakWordResults: getWeakWordResults,
    buildVoiceCoachingPlan: buildVoiceCoachingPlan,
    createSpeechPractice: createSpeechPractice
  };
})(globalThis);
