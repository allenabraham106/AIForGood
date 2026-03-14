(function (global) {
  const RecognitionConstructor = global.SpeechRecognition || global.webkitSpeechRecognition || null;
  const WORD_PATTERN = /[a-z0-9']+/gi;

  function supportsSpeechRecognition() {
    return typeof RecognitionConstructor === "function";
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
          score: similarity
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
          score: 0
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
        score: 0
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

  function summarizeAttempt(wordResults, recognitionConfidence) {
    const averageWordScore = wordResults.length === 0
      ? 0
      : wordResults.reduce(function (sum, wordResult) {
          return sum + wordResult.score;
        }, 0) / wordResults.length;

    const strongWordCount = wordResults.filter(function (wordResult) {
      return wordResult.score >= 0.65;
    }).length;

    const coverageScore = wordResults.length === 0 ? 0 : strongWordCount / wordResults.length;
    let overallScore = averageWordScore * 0.82 + coverageScore * 0.18;

    if (typeof recognitionConfidence === "number" && !Number.isNaN(recognitionConfidence)) {
      overallScore = overallScore * 0.9 + clamp(recognitionConfidence, 0, 1) * 0.1;
    }

    overallScore = clamp(overallScore, 0, 1);

    if (overallScore >= 0.85) {
      return {
        overallScore: overallScore,
        ratingKey: "strong",
        ratingLabel: "Strong Match",
        message: "Strong match. The browser heard most of the phrase clearly."
      };
    }

    if (overallScore >= 0.65) {
      return {
        overallScore: overallScore,
        ratingKey: "good",
        ratingLabel: "Good Match",
        message: "Good start. Try the red words again a little more slowly."
      };
    }

    return {
      overallScore: overallScore,
      ratingKey: "try-again",
      ratingLabel: "Try Again",
      message: "Try again slowly and clearly. Focus on the red words first."
    };
  }

  function scoreAttempt(targetText, spokenText, recognitionConfidence) {
    const targetTokens = tokenizeDetailed(targetText);
    const spokenTokens = tokenizeDetailed(spokenText);
    const alignedWords = buildAlignment(targetTokens, spokenTokens).map(function (wordResult) {
      const score = clamp(wordResult.score, 0, 1);

      return Object.assign({}, wordResult, {
        score: score,
        color: scoreToColor(score),
        quality: describeWordScore(score)
      });
    });

    const summary = summarizeAttempt(alignedWords, recognitionConfidence);

    return {
      targetText: normalizeWhitespace(targetText),
      transcript: normalizeWhitespace(spokenText),
      recognitionConfidence: typeof recognitionConfidence === "number" ? clamp(recognitionConfidence, 0, 1) : null,
      wordResults: alignedWords,
      overallScore: summary.overallScore,
      ratingKey: summary.ratingKey,
      ratingLabel: summary.ratingLabel,
      message: summary.message
    };
  }

  function createPracticeError(code) {
    const error = new Error(mapRecognitionError(code));
    error.code = code;
    return error;
  }

  function mapRecognitionError(code) {
    switch (code) {
      case "not-allowed":
        return "Microphone permission was denied.";
      case "audio-capture":
        return "No working microphone was found.";
      case "network":
        return "Speech recognition needs a network connection in this browser.";
      case "no-speech":
        return "No speech was detected. Try again and start speaking after the mic turns on.";
      case "service-not-allowed":
        return "Speech recognition is not available in this browser profile.";
      case "language-not-supported":
        return "The browser does not support this speech recognition language setting.";
      case "stopped":
      case "aborted":
        return "Listening stopped.";
      default:
        return "Speech recognition failed. Please try again.";
    }
  }

  function createSpeechPractice(options) {
    const settings = Object.assign(
      {
        lang: "en-CA"
      },
      options || {}
    );

    let activeSession = null;

    function stop() {
      if (!activeSession) {
        return;
      }

      activeSession.stoppedManually = true;

      try {
        activeSession.recognition.stop();
      } catch (error) {
        activeSession = null;
      }
    }

    function listenForPhrase(targetText, callbacks) {
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
          recognition: recognition,
          stoppedManually: false,
          settled: false
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

          if (activeSession === session) {
            activeSession = null;
          }

          action();
        }

        recognition.onstart = function () {
          if (safeCallbacks.onStateChange) {
            safeCallbacks.onStateChange({
              status: "listening"
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
              transcript: normalizeWhitespace(finalTranscript + " " + interimTranscript)
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
              status: "processing"
            });
          }

          const analysis = scoreAttempt(targetText, transcript, bestConfidence);

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

    return {
      listenForPhrase: listenForPhrase,
      stop: stop,
      getSettings: function () {
        return Object.assign({}, settings);
      }
    };
  }

  global.CareVoicePractice = {
    supportsSpeechRecognition: supportsSpeechRecognition,
    tokenizeDetailed: tokenizeDetailed,
    scoreAttempt: scoreAttempt,
    createSpeechPractice: createSpeechPractice
  };
})(globalThis);
