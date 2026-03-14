const WORD_PATTERN = /[a-z0-9']+/gi;

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeWhitespace(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function normalizeWord(word) {
  return String(word || '').toLowerCase().replace(/[^a-z0-9']/g, '');
}

function tokenizeDetailed(text) {
  const matches = String(text || '').match(WORD_PATTERN) || [];

  return matches.map((token) => ({
    display: token,
    normalized: normalizeWord(token),
  })).filter((token) => token.normalized.length > 0);
}

function levenshteinDistance(a, b) {
  const left = normalizeWord(a);
  const right = normalizeWord(b);
  const rows = left.length + 1;
  const cols = right.length + 1;
  const matrix = Array.from({ length: rows }, () => new Array(cols).fill(0));

  for (let row = 0; row < rows; row += 1) {
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
        matrix[row - 1][col - 1] + cost,
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
  const scores = Array.from({ length: rows }, () => new Array(cols).fill(0));
  const steps = Array.from({ length: rows }, () => new Array(cols).fill('none'));

  for (let row = 1; row < rows; row += 1) {
    scores[row][0] = scores[row - 1][0] - gapPenalty;
    steps[row][0] = 'up';
  }

  for (let col = 1; col < cols; col += 1) {
    scores[0][col] = scores[0][col - 1] - gapPenalty;
    steps[0][col] = 'left';
  }

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const similarity = wordSimilarity(targetTokens[row - 1].normalized, spokenTokens[col - 1].normalized);
      const diagonal = scores[row - 1][col - 1] + similarity - matchBias;
      const up = scores[row - 1][col] - gapPenalty;
      const left = scores[row][col - 1] - gapPenalty;
      let bestScore = diagonal;
      let bestStep = 'diag';

      if (up > bestScore) {
        bestScore = up;
        bestStep = 'up';
      }

      if (left > bestScore) {
        bestScore = left;
        bestStep = 'left';
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

    if (step === 'diag' && row > 0 && col > 0) {
      const targetToken = targetTokens[row - 1];
      const spokenToken = spokenTokens[col - 1];
      alignedResults[row - 1] = {
        targetWord: targetToken.display,
        normalizedTargetWord: targetToken.normalized,
        matchedWord: spokenToken.display,
        normalizedMatchedWord: spokenToken.normalized,
        score: wordSimilarity(targetToken.normalized, spokenToken.normalized),
      };
      row -= 1;
      col -= 1;
      continue;
    }

    if (step === 'up' && row > 0) {
      const targetToken = targetTokens[row - 1];
      alignedResults[row - 1] = {
        targetWord: targetToken.display,
        normalizedTargetWord: targetToken.normalized,
        matchedWord: '',
        normalizedMatchedWord: '',
        score: 0,
      };
      row -= 1;
      continue;
    }

    if (step === 'left' && col > 0) {
      col -= 1;
      continue;
    }

    break;
  }

  return alignedResults.map((result, index) => result || {
    targetWord: targetTokens[index].display,
    normalizedTargetWord: targetTokens[index].normalized,
    matchedWord: '',
    normalizedMatchedWord: '',
    score: 0,
  });
}

function scoreToColor(score) {
  const hue = Math.round(clamp(score, 0, 1) * 120);
  return `hsl(${hue} 72% 78%)`;
}

function describeWordScore(score) {
  if (score >= 0.85) return 'strong';
  if (score >= 0.65) return 'good';
  if (score >= 0.4) return 'partial';
  return 'weak';
}

function summarizeAttempt(overallScore) {
  if (overallScore >= 0.85) {
    return {
      ratingKey: 'strong',
      ratingLabel: 'Strong Match',
      message: 'Nice work. You said the whole phrase clearly.',
    };
  }

  if (overallScore >= 0.65) {
    return {
      ratingKey: 'good',
      ratingLabel: 'Good Match',
      message: 'Good start. A few words need more practice.',
    };
  }

  return {
    ratingKey: 'try-again',
    ratingLabel: 'Try Again',
    message: 'Try again slowly. Focus on the hardest words first.',
  };
}

export function scoreTranscriptAttempt(targetText, spokenText, recognitionConfidence = null) {
  const normalizedTargetText = normalizeWhitespace(targetText);
  const normalizedSpokenText = normalizeWhitespace(spokenText);
  const targetTokens = tokenizeDetailed(normalizedTargetText);
  const spokenTokens = tokenizeDetailed(normalizedSpokenText);
  const alignedWords = buildAlignment(targetTokens, spokenTokens).map((wordResult) => {
    const score = clamp(wordResult.score, 0, 1);
    return {
      ...wordResult,
      score,
      color: scoreToColor(score),
      quality: describeWordScore(score),
    };
  });

  const averageWordScore = alignedWords.length === 0
    ? 0
    : alignedWords.reduce((sum, wordResult) => sum + wordResult.score, 0) / alignedWords.length;
  const strongWordCount = alignedWords.filter((wordResult) => wordResult.score >= 0.65).length;
  const coverageScore = alignedWords.length === 0 ? 0 : strongWordCount / alignedWords.length;
  let overallScore = averageWordScore * 0.82 + coverageScore * 0.18;

  if (typeof recognitionConfidence === 'number' && !Number.isNaN(recognitionConfidence)) {
    overallScore = overallScore * 0.9 + clamp(recognitionConfidence, 0, 1) * 0.1;
  }

  overallScore = clamp(overallScore, 0, 1);
  const summary = summarizeAttempt(overallScore);

  return {
    targetText: normalizedTargetText,
    transcript: normalizedSpokenText,
    recognitionConfidence: typeof recognitionConfidence === 'number' ? clamp(recognitionConfidence, 0, 1) : null,
    wordResults: alignedWords,
    overallScore,
    ratingKey: summary.ratingKey,
    ratingLabel: summary.ratingLabel,
    message: summary.message,
    metricsText: 'Transcript match scoring',
  };
}

export function getWeakWordResults(analysis, maxCount = 2) {
  const safeAnalysis = analysis || {};
  return (Array.isArray(safeAnalysis.wordResults) ? safeAnalysis.wordResults : [])
    .filter((wordResult) => typeof wordResult.score === 'number' && wordResult.score < 0.7)
    .sort((left, right) => left.score - right.score)
    .slice(0, maxCount);
}

export function buildVerbalFeedback(analysis) {
  const safeAnalysis = analysis || {};
  const weakWords = getWeakWordResults(safeAnalysis, 2).map((wordResult) => wordResult.targetWord);

  if (!safeAnalysis.transcript) {
    return 'I did not hear enough words. Please try the phrase again.';
  }

  if (weakWords.length === 0) {
    return 'Nice work. You said the whole phrase clearly.';
  }

  if (weakWords.length === 1) {
    return `Good start. Try ${weakWords[0]} again, then say the full phrase.`;
  }

  return `Good start. Practice ${weakWords[0]} and ${weakWords[1]}, then say the full phrase.`;
}

export function buildVoiceFeedbackResponse(transcript, expectedPhrase, recognitionConfidence = null) {
  const normalizedTranscript = normalizeWhitespace(transcript);
  const normalizedExpectedPhrase = normalizeWhitespace(expectedPhrase);

  if (!normalizedTranscript) {
    return {
      answer: 'I did not hear enough words. Please try the phrase again.',
      correct: false,
      analysis: null,
    };
  }

  if (!normalizedExpectedPhrase) {
    return {
      answer: 'Thank you. Please try the practice phrase one more time.',
      correct: false,
      analysis: null,
    };
  }

  const analysis = scoreTranscriptAttempt(normalizedExpectedPhrase, normalizedTranscript, recognitionConfidence);
  const correct = analysis.overallScore >= 0.78;
  return {
    answer: buildVerbalFeedback(analysis),
    correct,
    analysis: {
      overallScore: analysis.overallScore,
      ratingKey: analysis.ratingKey,
      ratingLabel: analysis.ratingLabel,
      transcript: analysis.transcript,
      targetText: analysis.targetText,
      weakestWords: getWeakWordResults(analysis, 2).map((wordResult) => wordResult.targetWord),
      wordResults: analysis.wordResults,
    },
  };
}

