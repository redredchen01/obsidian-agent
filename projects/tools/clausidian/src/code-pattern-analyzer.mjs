/**
 * Code Pattern Analyzer — extract, cluster, and score reusable code patterns
 * Wraps PatternDetector.extractCodePatterns with enriched reporting
 */

import { PatternDetector } from './pattern-detector.mjs';

/**
 * Language-to-effort multiplier for complexity estimation
 */
const LANG_EFFORT = {
  typescript: 1.2, javascript: 1.0, python: 0.9, go: 1.3,
  java: 1.4, rust: 1.5, bash: 0.7, shell: 0.7, unknown: 1.0,
};

/**
 * Estimate implementation effort in hours for a code pattern
 * @param {Object} pattern
 * @returns {number} hours
 */
function estimateEffortHours(pattern) {
  const langMultiplier = LANG_EFFORT[pattern.language] || 1.0;
  const baseHours = Math.max(1, Math.ceil(pattern.size / 30));
  const complexityBonus = pattern.complexity > 5 ? 1 : 0;
  const asyncBonus = pattern.features?.hasAsync ? 0.5 : 0;
  const errorBonus = pattern.features?.hasError ? 0.5 : 0;
  return Math.round((baseHours + complexityBonus + asyncBonus + errorBonus) * langMultiplier * 10) / 10;
}

/**
 * Categorize a code pattern by its dominant features
 * @param {Object} pattern
 * @returns {string} category label
 */
function categorizePattern(pattern) {
  const { features = {}, language } = pattern;
  if (features.hasRetry) return 'retry-handler';
  if (features.hasAsync && features.hasError) return 'async-error-handler';
  if (features.hasAsync) return 'async-utility';
  if (features.hasError) return 'error-handler';
  if (language === 'bash' || language === 'shell') return 'shell-script';
  if (pattern.complexity > 7) return 'complex-logic';
  return 'utility';
}

/**
 * Score abstraction potential: how easily can this pattern be generalized?
 * @param {Object} pattern
 * @returns {number} 0-10
 */
function scoreAbstractionPotential(pattern) {
  let score = 5;
  // More variants → easier to abstract
  score += Math.min(3, pattern.variants?.length - 1 || 0);
  // High reusability base
  score += Math.min(2, Math.floor(pattern.reusability || 0));
  // Low complexity → easier to extract
  if (pattern.complexity <= 3) score += 1;
  if (pattern.complexity >= 8) score -= 2;
  // Multi-file usage
  if ((pattern.files?.length || 0) > 2) score += 1;
  return Math.max(0, Math.min(10, score));
}

/**
 * Compute similarity matrix for top patterns (for dedup/merge suggestions)
 * @param {Array<Object>} patterns
 * @param {PatternDetector} detector
 * @returns {Array<{i, j, similarity}>} pairs above threshold
 */
function computeSimilarityPairs(patterns, detector, threshold = 0.7) {
  const pairs = [];
  for (let i = 0; i < patterns.length; i++) {
    for (let j = i + 1; j < patterns.length; j++) {
      const sim = detector.codePatternSimilarity(patterns[i].code, patterns[j].code);
      if (sim >= threshold) {
        pairs.push({ i, j, similarity: Math.round(sim * 100) / 100 });
      }
    }
  }
  return pairs;
}

/**
 * Analyze code patterns from a set of notes
 * @param {Array<{file, title, body}>} notes
 * @param {Object} options
 * @returns {{ patterns, summary, similarityPairs, totalPatterns, totalSavings }}
 */
export function analyzeCodePatterns(notes, options = {}) {
  const { topN = 15, similarityThreshold = 0.7, detectorOptions = {} } = options;

  if (!notes || notes.length === 0) {
    return { patterns: [], summary: emptySummary(), similarityPairs: [], totalPatterns: 0, totalSavings: 0 };
  }

  const detector = new PatternDetector(detectorOptions);
  const raw = detector.extractCodePatterns(notes);

  const enriched = raw.patterns.slice(0, topN).map(p => ({
    ...p,
    effortHours: estimateEffortHours(p),
    category: categorizePattern(p),
    abstractionPotential: scoreAbstractionPotential(p),
    generalizationScore: Math.round((p.reusability || 0) * 10) / 10,
  }));

  enriched.sort((a, b) => b.abstractionPotential - a.abstractionPotential || b.reusability - a.reusability);

  const similarityPairs = computeSimilarityPairs(enriched, detector, similarityThreshold);

  const summary = buildSummary(enriched, raw);

  return {
    patterns: enriched,
    summary,
    similarityPairs,
    totalPatterns: raw.totalPatterns,
    totalSavings: raw.totalSavings,
  };
}

function emptySummary() {
  return {
    patternCount: 0, languages: {}, categories: {}, avgEffortHours: 0,
    avgComplexity: 0, avgAbstractionPotential: 0, topPatterns: [],
  };
}

function buildSummary(enriched, raw) {
  if (enriched.length === 0) return emptySummary();

  const languages = {};
  const categories = {};
  let totalEffort = 0, totalComplexity = 0, totalAbstraction = 0;

  for (const p of enriched) {
    languages[p.language] = (languages[p.language] || 0) + 1;
    categories[p.category] = (categories[p.category] || 0) + 1;
    totalEffort += p.effortHours;
    totalComplexity += p.complexity || 0;
    totalAbstraction += p.abstractionPotential;
  }

  const n = enriched.length;
  return {
    patternCount: n,
    languages,
    categories,
    avgEffortHours: Math.round(totalEffort / n * 10) / 10,
    avgComplexity: Math.round(totalComplexity / n * 10) / 10,
    avgAbstractionPotential: Math.round(totalAbstraction / n * 10) / 10,
    topPatterns: enriched.slice(0, 5).map(p => ({
      id: p.id,
      language: p.language,
      category: p.category,
      abstractionPotential: p.abstractionPotential,
      effortHours: p.effortHours,
      usageCount: p.usageCount,
    })),
    totalSavingsLines: raw.totalSavings,
    totalPatterns: raw.totalPatterns,
  };
}

/**
 * Filter patterns by minimum quality bar
 * @param {Array} patterns
 * @param {Object} criteria
 * @returns {Array}
 */
export function filterPatterns(patterns, criteria = {}) {
  const { minAbstraction = 0, minUsageCount = 1, minEffortHours = 0, maxEffortHours = Infinity, languages } = criteria;
  return patterns.filter(p =>
    p.abstractionPotential >= minAbstraction &&
    p.usageCount >= minUsageCount &&
    p.effortHours >= minEffortHours &&
    p.effortHours <= maxEffortHours &&
    (!languages || languages.includes(p.language))
  );
}

export default { analyzeCodePatterns, filterPatterns };
