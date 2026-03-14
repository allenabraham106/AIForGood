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

  function normalizeWhitespace(text) {
    return String(text || "").replace(/\s+/g, " ").trim();
  }

  function normalizeWord(word) {
    return String(word || "").toLowerCase().replace(/[^a-z0-9']/g, "");
  }

  function tokenizeDetailed(text) {
    const matches = String(text || "").match(WORD_PATTERN) || [];

    return matches
      .map(function (token) {
        return {
          display: token,
          normalized: normalizeWord(token)
        };
      })
      .filter(function (token) {
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

  function normalizeHundredScore(value) {
    const numericValue = toNumber(value);
    return numericValue === null ? null : clamp(numericValue / 100, 0, 1);
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
        const similarity = wordSimilarity(targetToken.normalized, spokenToken.normalized);

        alignedResults[row - 1] = {
          targetWord: targetToken.display,
          normalizedTargetWord: targetToken.normalized,
          matchedWord: spokenToken.display,
          normalizedMatchedWord: spokenToken.normalized,
          score: similarity,
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
      if (result) {
        return result;
      }

      return {
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
      return {
        overallScore: overallScore,
        ratingKey: "strong",
        ratingLabel: "Strong Match",
        message: providerLabel + " heard the phrase clearly."
      };
    }

    if (overallScore >= 0.65) {
      return {
        overallScore: overallScore,
        ratingKey: "good",
        ratingLabel: "Good Match",
        message: extraDetails.hasSyllables
          ? "Good start. Try the red words and syllables again a little more slowly."
          : "Good start. Try the red words again a little more slowly."
      };
    }

    return {
      overallScore: overallScore,
      ratingKey: "try-again",
      ratingLabel: "Try Again",
      message: extraDetails.hasSyllables
        ? "Try again slowly. Focus on the red words and syllables first."
        : "Try again slowly and clearly. Focus on the red words first."
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

  function scoreTranscriptAttempt(targetText, spokenText, recognitionConfidence) {
    const targetTokens = tokenizeDetailed(targetText);
    const spokenTokens = tokenizeDetailed(spokenText);
    const alignedWords = finalizeWordResults(buildAlignment(targetTokens, spokenTokens), function (wordResult) {
      return Object.assign({}, wordResult, {
        syllables: [],
        phonemes: [],
        errorType: wordResult.matchedWord ? "None" : "Omission"
      });
    });

    const averageWordScore = alignedWords.length === 0
      ? 0
      : alignedWords.reduce(function (sum, wordResult) {
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

    const summary = summarizeAttempt(overallScore, "The browser", {
      hasSyllables: false
    });

    return {
      providerKey: "browser",
      providerLabel: "Browser Fallback",
      targetText: normalizeWhitespace(targetText),
      transcript: normalizeWhitespace(spokenText),
      recognitionConfidence: typeof recognitionConfidence === "number" ? clamp(recognitionConfidence, 0, 1) : null,
      wordResults: alignedWords,
      overallScore: summary.overallScore,
      ratingKey: summary.ratingKey,
      ratingLabel: summary.ratingLabel,
      message: summary.message,
      metricsText: "Browser transcript match only"
    };
  }

  function mapAzureSubunits(items, labelKey) {
    return Array.isArray(items)
      ? items.map(function (item) {
          const accuracyScore = normalizeHundredScore(item && item.PronunciationAssessment ? item.PronunciationAssessment.AccuracyScore : null);
          const label = item && item[labelKey] ? String(item[labelKey]) : "";
          const score = accuracyScore === null ? 0 : accuracyScore;

          return {
            label: label,
            score: score,
            color: scoreToColor(score),
            quality: describeWordScore(score)
          };
        }).filter(function (item) {
          return item.label.length > 0;
        })
      : [];
  }

  function mapAzureWords(words) {
    return Array.isArray(words)
      ? words.map(function (word) {
          return {
            display: word && word.Word ? String(word.Word) : "",
            normalized: normalizeWord(word && word.Word ? word.Word : ""),
            accuracyScore: normalizeHundredScore(word && word.PronunciationAssessment ? word.PronunciationAssessment.AccuracyScore : null),
            errorType: word && word.PronunciationAssessment && word.PronunciationAssessment.ErrorType
              ? String(word.PronunciationAssessment.ErrorType)
              : "None",
            syllables: mapAzureSubunits(word ? word.Syllables : [], "Syllable"),
            phonemes: mapAzureSubunits(word ? word.Phonemes : [], "Phoneme")
          };
        }).filter(function (word) {
          return word.normalized.length > 0;
        })
      : [];
  }

  function scoreAzureAttempt(targetText, spokenText, serviceJson) {
    const topResult = serviceJson && Array.isArray(serviceJson.NBest) && serviceJson.NBest.length > 0 ? serviceJson.NBest[0] : null;
    const pronunciation = topResult && topResult.PronunciationAssessment ? topResult.PronunciationAssessment : {};
    const spokenWords = mapAzureWords(topResult ? topResult.Words : []);
    const targetTokens = tokenizeDetailed(targetText);
    const alignedWords = finalizeWordResults(buildAlignment(targetTokens, spokenWords), function (wordResult) {
      const matchedToken = wordResult.matchedToken;
      const similarityScore = clamp(wordResult.score, 0, 1);
      const azureAccuracy = matchedToken && matchedToken.accuracyScore !== null ? matchedToken.accuracyScore : null;
      let combinedScore = similarityScore;

      if (azureAccuracy !== null) {
        combinedScore = clamp(azureAccuracy * 0.75 + similarityScore * 0.25, 0, 1);
      }

      if (!matchedToken || (matchedToken.errorType && matchedToken.errorType !== "None")) {
        combinedScore = Math.min(combinedScore, matchedToken ? 0.45 : 0);
      }

      return Object.assign({}, wordResult, {
        score: combinedScore,
        errorType: matchedToken ? matchedToken.errorType : "Omission",
        syllables: matchedToken ? matchedToken.syllables : [],
        phonemes: matchedToken ? matchedToken.phonemes : []
      });
    });

    const averageWordScore = alignedWords.length === 0
      ? 0
      : alignedWords.reduce(function (sum, wordResult) {
          return sum + wordResult.score;
        }, 0) / alignedWords.length;

    const pronunciationScore = normalizeHundredScore(pronunciation.PronScore);
    const accuracyScore = normalizeHundredScore(pronunciation.AccuracyScore);
    const fluencyScore = normalizeHundredScore(pronunciation.FluencyScore);
    const completenessScore = normalizeHundredScore(pronunciation.CompletenessScore);
    const prosodyScore = normalizeHundredScore(pronunciation.ProsodyScore);
    const hasSyllables = alignedWords.some(function (wordResult) {
      return wordResult.syllables.length > 0;
    });
    const hasPhonemes = alignedWords.some(function (wordResult) {
      return wordResult.phonemes.length > 0;
    });

    let overallScore = averageWordScore;

    if (pronunciationScore !== null) {
      overallScore = clamp(pronunciationScore * 0.72 + averageWordScore * 0.28, 0, 1);
    }

    const summary = summarizeAttempt(overallScore, "Azure pronunciation", {
      hasSyllables: hasSyllables
    });

    const metrics = [];

    if (accuracyScore !== null) {
      metrics.push("Accuracy " + Math.round(accuracyScore * 100));
    }

    if (fluencyScore !== null) {
      metrics.push("Fluency " + Math.round(fluencyScore * 100));
    }

    if (completenessScore !== null) {
      metrics.push("Completeness " + Math.round(completenessScore * 100));
    }

    if (prosodyScore !== null) {
      metrics.push("Prosody " + Math.round(prosodyScore * 100));
    }

    return {
      providerKey: "azure",
      providerLabel: "Azure Pronunciation",
      targetText: normalizeWhitespace(targetText),
      transcript: normalizeWhitespace(spokenText || (topResult && topResult.Display) || ""),
      recognitionConfidence: topResult && typeof topResult.Confidence === "number" ? clamp(topResult.Confidence, 0, 1) : null,
      wordResults: alignedWords,
      overallScore: summary.overallScore,
      ratingKey: summary.ratingKey,
      ratingLabel: summary.ratingLabel,
      message: summary.message,
      metricsText: metrics.concat(hasSyllables ? ["Syllables"] : hasPhonemes ? ["Phonemes only"] : []).length > 0
        ? metrics.concat(hasSyllables ? ["Syllables"] : hasPhonemes ? ["Phonemes only"] : []).join(" · ")
        : "Azure pronunciation scoring",
      subwordType: hasSyllables ? "syllables" : hasPhonemes ? "phonemes" : "none",
      pronunciationScores: {
        pronunciation: pronunciationScore,
        accuracy: accuracyScore,
        fluency: fluencyScore,
        completeness: completenessScore,
        prosody: prosodyScore
      }
    };
  }

  function createPracticeError(code, details) {
    const error = new Error(mapRecognitionError(code, details));
    error.code = code;
    error.details = details || "";
    return error;
  }

  function mapRecognitionError(code, details) {
    switch (code) {
      case "not-allowed":
        return "Microphone permission was denied.";
      case "audio-capture":
        return "No working microphone was found.";
      case "network":
        return "Speech recognition needs a network connection in this browser.";
      case "no-speech":
      case "azure-no-match":
        return "No speech was detected. Try again and start speaking after the mic turns on.";
      case "service-not-allowed":
        return "Speech recognition is not available in this browser profile.";
      case "language-not-supported":
        return "The browser does not support this speech recognition language setting.";
      case "azure-script-missing":
        return "Azure Speech SDK is not loaded, so the app is using the browser fallback.";
      case "azure-not-configured":
        return "Azure Speech is not configured yet. Add your key and region to .env.local.";
      case "azure-token-failed":
        return "Azure token request failed. Check your key, region, and local server." + (details ? " " + details : "");
      case "azure-service-unavailable":
        return "Azure pronunciation failed. The app can fall back to the browser matcher." + (details ? " " + details : "");
      case "stopped":
      case "aborted":
        return "Listening stopped.";
      default:
        return "Speech recognition failed. Please try again.";
    }
  }

  function shouldFallbackToBrowser(code) {
    return code === "azure-script-missing" ||
      code === "azure-not-configured" ||
      code === "azure-token-failed" ||
      code === "azure-service-unavailable";
  }

  function createSpeechPractice(options) {
    const settings = Object.assign(
      {
        lang: "en-CA",
        azureConfigUrl: "/api/azure-speech-config",
        azureTokenUrl: "/api/azure-speech-token",
        preferAzure: true
      },
      options || {}
    );

    let activeSession = null;
    let cachedAzureConfig = null;

    function clearActiveSession(session) {
      if (activeSession === session) {
        activeSession = null;
      }

      if (session && session.cleanup) {
        session.cleanup();
      }
    }

    function stop() {
      if (!activeSession) {
        return;
      }

      const session = activeSession;
      session.stoppedManually = true;

      if (typeof session.cancel === "function") {
        session.cancel();
      }

      if (session.provider === "browser") {
        try {
          session.recognition.stop();
        } catch (error) {
          clearActiveSession(session);
        }

        return;
      }

      if (session.provider === "azure") {
        clearActiveSession(session);
      }
    }

    async function fetchJson(url) {
      const response = await global.fetch(url, {
        cache: "no-store"
      });
      const responseText = await response.text();
      const parsed = safeJsonParse(responseText);

      if (!response.ok) {
        const message = parsed && parsed.error ? parsed.error : responseText;
        throw createPracticeError("azure-token-failed", message);
      }

      return parsed || {};
    }

    async function getAzureConfig() {
      if (cachedAzureConfig) {
        return cachedAzureConfig;
      }

      try {
        cachedAzureConfig = await fetchJson(settings.azureConfigUrl);
      } catch (error) {
        cachedAzureConfig = {
          enabled: false,
          error: error.message
        };
      }

      return cachedAzureConfig;
    }

    async function getRuntimeInfo() {
      const azureConfig = settings.preferAzure ? await getAzureConfig() : { enabled: false };
      const azureReady = settings.preferAzure && azureConfig.enabled && supportsAzureSpeechSDK();
      const browserReady = supportsSpeechRecognition();

      if (azureReady) {
        return {
          available: true,
          preferredProvider: "azure",
          label: "Azure Pronunciation",
          supportText: "Azure pronunciation scoring is ready. The app uses en-US so Azure can return syllable feedback."
        };
      }

      if (browserReady) {
        return {
          available: true,
          preferredProvider: "browser",
          label: "Browser Fallback",
          supportText: "Azure is not ready yet, so this will compare the browser transcript to the target phrase."
        };
      }

      return {
        available: false,
        preferredProvider: "none",
        label: "Unavailable",
        supportText: "Speech intake is not available in this browser. Use Chrome or Edge on the local demo server."
      };
    }

    function listenWithBrowser(targetText, callbacks) {
      const safeCallbacks = callbacks || {};

      if (!supportsSpeechRecognition()) {
        return Promise.reject(createPracticeError("service-not-allowed"));
      }

      if (activeSession) {
        stop();
      }

      return new Promise(function (resolve, reject) {
        const recognition = new RecognitionConstructor();
        let finalTranscript = "";
        let interimTranscript = "";
        let bestConfidence = null;
        const session = {
          provider: "browser",
          recognition: recognition,
          stoppedManually: false,
          settled: false,
          cleanup: function () {},
          cancel: function () {}
        };

        activeSession = session;
        recognition.lang = settings.lang;
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        function finish(action) {
          if (session.settled) {
            return;
          }

          session.settled = true;
          clearActiveSession(session);
          action();
        }

        session.cancel = function () {
          finish(function () {
            reject(createPracticeError("stopped"));
          });
        };

        recognition.onstart = function () {
          if (safeCallbacks.onStateChange) {
            safeCallbacks.onStateChange({
              status: "listening",
              provider: "browser"
            });
          }
        };

        recognition.onresult = function (event) {
          interimTranscript = "";

          for (let index = event.resultIndex; index < event.results.length; index += 1) {
            const result = event.results[index];
            const alternative = result[0];

            if (!alternative) {
              continue;
            }

            if (result.isFinal) {
              finalTranscript += alternative.transcript + " ";

              if (typeof alternative.confidence === "number" && !Number.isNaN(alternative.confidence)) {
                bestConfidence = bestConfidence === null
                  ? alternative.confidence
                  : Math.max(bestConfidence, alternative.confidence);
              }
            } else {
              interimTranscript += alternative.transcript + " ";
            }
          }

          if (safeCallbacks.onInterim) {
            safeCallbacks.onInterim({
              transcript: normalizeWhitespace(finalTranscript + " " + interimTranscript),
              provider: "browser"
            });
          }
        };

        recognition.onerror = function (event) {
          const code = session.stoppedManually ? "stopped" : event.error;

          finish(function () {
            reject(createPracticeError(code));
          });
        };

        recognition.onend = function () {
          if (session.settled) {
            return;
          }

          if (session.stoppedManually) {
            finish(function () {
              reject(createPracticeError("stopped"));
            });
            return;
          }

          const transcript = normalizeWhitespace(finalTranscript || interimTranscript);

          if (!transcript) {
            finish(function () {
              reject(createPracticeError("no-speech"));
            });
            return;
          }

          if (safeCallbacks.onStateChange) {
            safeCallbacks.onStateChange({
              status: "processing",
              provider: "browser"
            });
          }

          const analysis = scoreTranscriptAttempt(targetText, transcript, bestConfidence);

          if (safeCallbacks.onResult) {
            safeCallbacks.onResult(analysis);
          }

          finish(function () {
            resolve(analysis);
          });
        };

        try {
          recognition.start();
        } catch (error) {
          finish(function () {
            reject(createPracticeError("service-not-allowed"));
          });
        }
      });
    }

    async function listenWithAzure(targetText, callbacks, azureConfig) {
      if (!supportsAzureSpeechSDK()) {
        throw createPracticeError("azure-script-missing");
      }

      if (!azureConfig || !azureConfig.enabled) {
        throw createPracticeError("azure-not-configured");
      }

      const safeCallbacks = callbacks || {};
      const tokenPayload = await fetchJson(settings.azureTokenUrl);
      const speechConfig = global.SpeechSDK.SpeechConfig.fromAuthorizationToken(tokenPayload.token, tokenPayload.region || azureConfig.region);
      const language = "en-US";
      const audioConfig = global.SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
      const recognizer = new global.SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
      const assessmentConfig = new global.SpeechSDK.PronunciationAssessmentConfig(
        targetText,
        global.SpeechSDK.PronunciationAssessmentGradingSystem.HundredMark,
        global.SpeechSDK.PronunciationAssessmentGranularity.Phoneme,
        true
      );

      speechConfig.speechRecognitionLanguage = language;

      if ((tokenPayload.enableProsody || azureConfig.enableProsody) && typeof assessmentConfig.enableProsodyAssessment === "function") {
        assessmentConfig.enableProsodyAssessment();
      }

      assessmentConfig.applyTo(recognizer);

      if (activeSession) {
        stop();
      }

      return new Promise(function (resolve, reject) {
        const session = {
          provider: "azure",
          recognizer: recognizer,
          audioConfig: audioConfig,
          stoppedManually: false,
          settled: false,
          cleanup: function () {
            try {
              recognizer.close();
            } catch (error) {
              // Ignore cleanup errors.
            }

            if (audioConfig && typeof audioConfig.close === "function") {
              try {
                audioConfig.close();
              } catch (error) {
                // Ignore cleanup errors.
              }
            }
          },
          cancel: function () {
            finish(function () {
              reject(createPracticeError("stopped"));
            });
          }
        };

        activeSession = session;

        function finish(action) {
          if (session.settled) {
            return;
          }

          session.settled = true;
          clearActiveSession(session);
          action();
        }

        recognizer.recognizing = function (_, event) {
          if (safeCallbacks.onInterim) {
            safeCallbacks.onInterim({
              transcript: normalizeWhitespace(event && event.result ? event.result.text : ""),
              provider: "azure"
            });
          }
        };

        recognizer.canceled = function (_, event) {
          if (session.settled || session.stoppedManually) {
            return;
          }

          const detailMessage = event && event.errorDetails ? event.errorDetails : "";

          finish(function () {
            reject(createPracticeError("azure-service-unavailable", detailMessage));
          });
        };

        if (safeCallbacks.onStateChange) {
          safeCallbacks.onStateChange({
            status: "listening",
            provider: "azure"
          });
        }

        recognizer.recognizeOnceAsync(
          function (result) {
            if (session.stoppedManually) {
              finish(function () {
                reject(createPracticeError("stopped"));
              });
              return;
            }

            if (!result || result.reason !== global.SpeechSDK.ResultReason.RecognizedSpeech) {
              finish(function () {
                reject(createPracticeError("azure-no-match"));
              });
              return;
            }

            if (safeCallbacks.onStateChange) {
              safeCallbacks.onStateChange({
                status: "processing",
                provider: "azure"
              });
            }

            const jsonResult = safeJsonParse(
              result.properties.getProperty(global.SpeechSDK.PropertyId.SpeechServiceResponse_JsonResult) || "{}"
            );
            const analysis = scoreAzureAttempt(targetText, result.text || "", jsonResult || {});

            if (safeCallbacks.onResult) {
              safeCallbacks.onResult(analysis);
            }

            finish(function () {
              resolve(analysis);
            });
          },
          function (error) {
            finish(function () {
              reject(createPracticeError("azure-service-unavailable", String(error || "")));
            });
          }
        );
      });
    }

    async function listenForPhrase(targetText, callbacks) {
      const safeCallbacks = callbacks || {};
      const runtimeInfo = await getRuntimeInfo();

      if (runtimeInfo.preferredProvider === "azure") {
        try {
          return await listenWithAzure(targetText, safeCallbacks, cachedAzureConfig);
        } catch (error) {
          if (!shouldFallbackToBrowser(error.code) || !supportsSpeechRecognition()) {
            throw error;
          }

          if (safeCallbacks.onStateChange) {
            safeCallbacks.onStateChange({
              status: "fallback",
              provider: "browser",
              message: "Azure was unavailable, so the app switched to the browser fallback."
            });
          }
        }
      }

      return listenWithBrowser(targetText, safeCallbacks);
    }

    return {
      listenForPhrase: listenForPhrase,
      stop: stop,
      getSettings: function () {
        return Object.assign({}, settings);
      },
      getRuntimeInfo: getRuntimeInfo
    };
  }

  global.CareVoicePractice = {
    supportsSpeechRecognition: supportsSpeechRecognition,
    supportsAzureSpeechSDK: supportsAzureSpeechSDK,
    tokenizeDetailed: tokenizeDetailed,
    scoreAttempt: scoreTranscriptAttempt,
    createSpeechPractice: createSpeechPractice
  };
})(globalThis);


