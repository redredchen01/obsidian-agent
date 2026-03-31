/**
 * Skill Recommender — rank skill ideas by ROI using 5D quality framework
 *
 * 5D Framework:
 *   Impact (25%)       — user benefit / business value
 *   Completeness (20%) — clarity of requirements
 *   Maturity (20%)     — feasibility & stability
 *   Reusability (20%)  — code reuse potential
 *   Complexity (15%)   — implementation difficulty (inverted: lower = better)
 */

import { PatternDetector } from './pattern-detector.mjs';

// 5D weights (must sum to 1.0)
const WEIGHTS = {
  impact: 0.25,
  completeness: 0.20,
  maturity: 0.20,
  reusability: 0.20,
  complexity: 0.15,
};

/**
 * Calculate 5D weighted quality score (0-10)
 * @param {Object} dims - {impact, completeness, maturity, reusability, complexity} each 0-10
 * @returns {number} weighted score 0-10
 */
export function calculate5DScore(dims) {
  const { impact = 5, completeness = 5, maturity = 5, reusability = 5, complexity = 5 } = dims;
  // Complexity is inverted: low complexity = high score
  const complexityScore = 10 - complexity;
  const raw =
    impact * WEIGHTS.impact +
    completeness * WEIGHTS.completeness +
    maturity * WEIGHTS.maturity +
    reusability * WEIGHTS.reusability +
    complexityScore * WEIGHTS.complexity;
  return Math.round(raw * 10) / 10;
}

/**
 * Estimate effort hours from a scored opportunity
 */
function estimateEffort(opp) {
  const base = opp.details?.size ? Math.ceil(opp.details.size / 30) : 4;
  const complexityBonus = (opp.complexity || 5) > 7 ? 2 : 0;
  return Math.max(1, base + complexityBonus);
}

/**
 * Calculate ROI score: quality / (effort + 1)
 * Higher = better value for time invested
 */
function calculateROI(qualityScore, effortHours) {
  return Math.round((qualityScore / (effortHours + 1)) * 100) / 100;
}

/**
 * Dedup candidates by skill name (keep highest score)
 */
function dedupCandidates(candidates) {
  const seen = new Map();
  for (const c of candidates) {
    const key = c.skill;
    if (!seen.has(key) || c.qualityScore > seen.get(key).qualityScore) {
      seen.set(key, c);
    }
  }
  return Array.from(seen.values());
}

/**
 * Build a recommendation from a scored opportunity
 */
function buildRecommendation(opp, rank) {
  const dims = {
    impact: Math.min(10, opp.impact || 5),
    completeness: Math.min(10, opp.completeness || 5),
    maturity: Math.min(10, opp.maturity || 5),
    reusability: Math.min(10, opp.reusability || 5),
    complexity: Math.min(10, opp.complexity || 5),
  };

  const qualityScore = calculate5DScore(dims);
  const effortHours = estimateEffort(opp);
  const roiScore = calculateROI(qualityScore, effortHours);

  return {
    rank,
    skill: opp.skill,
    source: opp.source,
    qualityScore,
    effortHours,
    roiScore,
    riskLevel: opp.riskLevel || 'medium',
    estimatedROI: opp.estimatedROI || `${Math.round(roiScore * 4)}h saved/month`,
    dimensions: dims,
    details: opp.details || {},
  };
}

/**
 * Main recommendation engine
 * @param {Object} insights - output from extractInsights (has insights array)
 * @param {Object} codePatterns - output from analyzeCodePatterns (optional)
 * @param {Object} options
 * @returns {{ skills, report, metadata }}
 */
export function recommendSkills(insights, codePatterns, options = {}) {
  const { topN = 10, minQualityScore = 0, minROI = 0, detectorOptions = {} } = options;

  const detector = new PatternDetector(detectorOptions);

  // Merge insights from vault mining and code patterns
  const patternData = codePatterns
    ? { patterns: (codePatterns.patterns || []).map(p => ({ ...p, estimatedSavings: p.totalSavings || p.size || 10 })) }
    : null;

  const painData = insights?.painPoints
    ? { painPoints: insights.painPoints, topPains: insights.metadata?.topPains || [] }
    : null;

  const scored = detector.scoreOpportunities(patternData, painData);

  // Build recommendations
  let candidates = scored.opportunities.map((opp, i) => buildRecommendation(opp, i + 1));

  // Also add direct insight candidates if provided
  if (insights?.insights) {
    for (const ins of insights.insights) {
      candidates.push(buildRecommendation(ins, 0));
    }
  }

  candidates = dedupCandidates(candidates);

  // Filter and sort by ROI
  candidates = candidates
    .filter(c => c.qualityScore >= minQualityScore && c.roiScore >= minROI)
    .sort((a, b) => b.roiScore - a.roiScore);

  // Re-rank after dedup+filter
  for (let i = 0; i < candidates.length; i++) candidates[i].rank = i + 1;

  const top = candidates.slice(0, topN);
  const report = generateReport(top, insights?.metadata);

  return {
    skills: top,
    report,
    metadata: {
      totalCandidates: candidates.length,
      topN: top.length,
      avgQuality: top.length
        ? Math.round(top.reduce((s, c) => s + c.qualityScore, 0) / top.length * 10) / 10
        : 0,
      avgROI: top.length
        ? Math.round(top.reduce((s, c) => s + c.roiScore, 0) / top.length * 100) / 100
        : 0,
      recommendation: scored.recommendation,
    },
  };
}

/**
 * Generate Markdown weekly report
 */
export function generateReport(skills, vaultMeta = {}) {
  const date = new Date().toISOString().slice(0, 10);
  const lines = [
    `# Obsidian Vault Mining — Weekly Report`,
    `Generated: ${date}`,
    '',
    `## Top ${skills.length} Skill Ideas (by ROI)`,
    '',
  ];

  for (const s of skills) {
    lines.push(`### ${s.rank}. ${s.skill} (ROI: ${s.roiScore})`);
    lines.push(`- Quality: ${s.qualityScore}/10`);
    lines.push(`- Effort: ~${s.effortHours}h`);
    lines.push(`- Risk: ${s.riskLevel}`);
    lines.push(`- Source: ${s.source}`);
    lines.push(`- Est. ROI: ${s.estimatedROI}`);
    if (s.details.pain) lines.push(`- Pain: ${s.details.pain}`);
    if (s.details.usageCount) lines.push(`- Code reuse: ${s.details.usageCount} variants found`);
    lines.push('');
  }

  if (vaultMeta) {
    lines.push('## Vault Metrics');
    if (vaultMeta.totalNotes) lines.push(`- Notes scanned: ${vaultMeta.totalNotes}`);
    if (vaultMeta.filtered) lines.push(`- Relevant notes: ${vaultMeta.filtered}`);
    if (vaultMeta.topPains?.length) lines.push(`- Top pain signals: ${vaultMeta.topPains.slice(0, 3).join(', ')}`);
    lines.push('');
  }

  lines.push('## Next Steps');
  lines.push('- Review top skills with team');
  lines.push('- Add to skill-factory queue');
  lines.push('- Start highest ROI skill on Monday');

  return lines.join('\n');
}

/**
 * Generate JSON report for machine consumption
 */
export function generateJSONReport(result) {
  return JSON.stringify({
    generatedAt: new Date().toISOString(),
    skills: result.skills,
    metadata: result.metadata,
  }, null, 2);
}

export default { recommendSkills, calculate5DScore, generateReport, generateJSONReport };
