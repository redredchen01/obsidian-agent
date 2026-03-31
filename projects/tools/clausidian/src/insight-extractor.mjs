/**
 * Insight Extractor — vault mining pipeline for Obsidian notes
 * Extracts insights, clusters by content, detects pain points
 * Reuses PatternDetector (TF-IDF, k-means, pain signal detection)
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, extname, basename } from 'path';
import { PatternDetector } from './pattern-detector.mjs';

const DEFAULT_PAIN_KEYWORDS = ['TODO', 'FIXME', 'PAIN', 'BUG', 'HACK', 'ISSUE', 'PROBLEM', 'BROKEN'];
const DEFAULT_MAX_CANDIDATES = 50;

/**
 * Load all .md notes from a vault directory (recursive)
 * @param {string} vaultRoot
 * @param {Object} options
 * @returns {Array<{file, title, body, tags, size}>}
 */
export function loadVaultNotes(vaultRoot, options = {}) {
  const { maxDepth = 5, excludeDirs = ['.obsidian', '.git', 'node_modules'] } = options;

  if (!existsSync(vaultRoot)) {
    throw new Error(`Vault not found: ${vaultRoot}`);
  }

  const notes = [];

  function walk(dir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (excludeDirs.includes(entry)) continue;
      const fullPath = join(dir, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (extname(entry) === '.md') {
        try {
          const raw = readFileSync(fullPath, 'utf8');
          const { body, tags, frontmatter } = parseNote(raw);
          notes.push({
            file: fullPath,
            title: frontmatter.title || basename(entry, '.md'),
            body,
            tags,
            size: stat.size,
          });
        } catch {
          // skip unreadable files
        }
      }
    }
  }

  walk(vaultRoot, 0);
  return notes;
}

/**
 * Parse frontmatter tags and body from raw markdown
 */
function parseNote(raw) {
  const lines = raw.split('\n');
  const frontmatter = {};
  let tags = [];
  let bodyStart = 0;

  if (lines[0] === '---') {
    let i = 1;
    while (i < lines.length && lines[i] !== '---') {
      const line = lines[i];
      const m = line.match(/^(\w+):\s*(.*)$/);
      if (m) {
        const [, key, val] = m;
        frontmatter[key] = val.trim();
        if (key === 'tags') {
          // inline tags: tags: [a, b] or tags: a, b
          tags = val.replace(/[\[\]]/g, '').split(',').map(t => t.trim()).filter(Boolean);
        }
      }
      i++;
    }
    bodyStart = i + 1;
  }

  // Also collect inline #tags from body
  const body = lines.slice(bodyStart).join('\n');
  const inlineTags = (body.match(/#([a-zA-Z][a-zA-Z0-9_-]*)/g) || []).map(t => t.slice(1));
  tags = [...new Set([...tags, ...inlineTags])];

  return { body, tags, frontmatter };
}

/**
 * Filter notes that contain any of the given keywords
 */
function filterByKeywords(notes, keywords) {
  const kwLower = keywords.map(k => k.toLowerCase());
  return notes.filter(note => {
    const text = `${note.title} ${note.body}`.toLowerCase();
    return kwLower.some(kw => text.includes(kw));
  });
}

/**
 * Main entry point: extract insights from vault
 * @param {string} vaultRoot - Path to Obsidian vault
 * @param {Object} options
 * @returns {{ insights, clusters, painPoints, metadata }}
 */
export async function extractInsights(vaultRoot, options = {}) {
  const {
    keywords = DEFAULT_PAIN_KEYWORDS,
    maxCandidates = DEFAULT_MAX_CANDIDATES,
    minNotes = 2,
    detectorOptions = {},
  } = options;

  const allNotes = loadVaultNotes(vaultRoot, options);

  if (allNotes.length === 0) {
    return { insights: [], clusters: [], painPoints: [], metadata: { totalNotes: 0, filtered: 0 } };
  }

  const filtered = filterByKeywords(allNotes, keywords);
  const workingSet = filtered.length >= minNotes ? filtered : allNotes;

  const detector = new PatternDetector(detectorOptions);

  const clusterResult = workingSet.length >= 2
    ? detector.clusterByContent(workingSet)
    : { clusters: [], overallQuality: 0, recommendedK: 0 };

  const { painPoints, topPains } = detector.detectPainPoints(workingSet);

  // Build scored opportunity list
  const codePatterns = detector.extractCodePatterns(workingSet);
  const opportunities = detector.scoreOpportunities(codePatterns, { painPoints, topPains });

  const insights = opportunities.opportunities.slice(0, maxCandidates).map(opp => ({
    rank: opp.rank,
    skill: opp.skill,
    source: opp.source,
    score: opp.score,
    roi: opp.estimatedROI,
    riskLevel: opp.riskLevel,
    details: opp.details,
  }));

  return {
    insights,
    clusters: clusterResult.clusters,
    painPoints,
    metadata: {
      totalNotes: allNotes.length,
      filtered: workingSet.length,
      clusterQuality: clusterResult.overallQuality,
      recommendedK: clusterResult.recommendedK,
      topPains,
    },
  };
}

export default { extractInsights, loadVaultNotes };
