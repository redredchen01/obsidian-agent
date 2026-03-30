/**
 * hook — event handlers for agent hooks (session-stop, daily-backfill, weekly-review)
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { dirname, join, basename, sep } from 'path';
import { Vault } from '../vault.mjs';
import { TemplateEngine } from '../templates.mjs';
import { IndexManager } from '../index-manager.mjs';
import { todayStr, isValidDate, weekdayShort, prevDate, nextDate } from '../dates.mjs';
import { notify } from '../notify.mjs';

function run(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', timeout: 30000 }).trim(); }
  catch { return ''; }
}

// ── Cross-platform recursive .git directory scanner ──

function findGitDirs(root, maxDepth = 5, depth = 0) {
  if (depth > maxDepth) return [];
  const dirs = [];
  let entries;
  try { entries = readdirSync(root, { withFileTypes: true }); } catch { return []; }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const full = join(root, entry.name);
    if (entry.name === '.git') {
      dirs.push(full);
    } else if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
      dirs.push(...findGitDirs(full, maxDepth, depth + 1));
    }
  }
  return dirs;
}

// ── Collect git commits for a date across all repos in a directory ──

function getGitCommits(scanRoot, date) {
  const since = `${date}T00:00:00`;
  const until = `${nextDate(date)}T00:00:00`;
  const gitDirs = findGitDirs(scanRoot);
  if (!gitDirs.length) return [];

  const commits = [];
  for (const gitDir of gitDirs) {
    const repo = dirname(gitDir);
    const repoName = basename(repo);
    const log = run(`git -C "${repo}" log --oneline --since="${since}" --until="${until}" --all`);
    if (log) {
      for (const line of log.split('\n').filter(Boolean)) {
        commits.push({ repo: repoName, message: line.replace(/^[a-f0-9]+ /, '') });
      }
    }
  }
  return commits;
}

// ── session-stop: append session summary to today's journal ──

export function sessionStop(vaultRoot, { scanRoot } = {}) {
  const vault = new Vault(vaultRoot);
  const tpl = new TemplateEngine(vaultRoot);
  const idx = new IndexManager(vault);
  const date = todayStr();

  // Read stdin (agent hook payload) — fd 0 works cross-platform
  let stdin = '';
  try { stdin = readFileSync(0, 'utf8'); } catch {}
  let hookData = {};
  try { hookData = JSON.parse(stdin); } catch {}

  const reason = hookData.stop_reason;
  if (!reason || reason === 'unknown') {
    console.log(JSON.stringify({ status: 'skipped', date, reason: 'no valid stop_reason' }));
    return;
  }

  const sessionNote = reason === 'user' ? 'User ended session' : `Session ended (${reason})`;
  const existing = vault.read('journal', `${date}.md`);

  if (existing) {
    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const appendLine = `\n- [${timestamp}] ${sessionNote}`;
    const updated = existing.replace(/## (今日[記记]錄|Records)\n/, `## $1\n${appendLine}\n`);
    vault.write('journal', `${date}.md`, updated);
    notify('obsidian-agent', `Session logged → journal/${date}.md`);
    console.log(JSON.stringify({ status: 'appended', date }));
  } else {
    const root = scanRoot || dirname(vaultRoot);
    const commits = getGitCommits(root, date);
    const summary = commits.length > 0
      ? `${commits.length} commits across ${new Set(commits.map(c => c.repo)).size} repos`
      : 'Auto-recorded session';

    const content = tpl.render('journal', {
      DATE: date,
      WEEKDAY: weekdayShort(date),
      PREV_DATE: prevDate(date),
      NEXT_DATE: nextDate(date),
    });

    vault.write('journal', `${date}.md`, content);
    idx.updateDirIndex('journal', date, summary);
    notify('obsidian-agent', `Journal created → ${date}.md`);
    console.log(JSON.stringify({ status: 'created', date }));
  }
}

// ── daily-backfill: create journal from git history ──

export function dailyBackfill(vaultRoot, { date, scanRoot, force } = {}) {
  const vault = new Vault(vaultRoot);
  const tpl = new TemplateEngine(vaultRoot);
  const idx = new IndexManager(vault);
  const d = date || todayStr();
  if (date && !isValidDate(date)) {
    throw new Error(`Invalid date: ${date}. Expected YYYY-MM-DD format.`);
  }

  if (vault.exists('journal', `${d}.md`) && !force) {
    console.log(JSON.stringify({ status: 'skip', date: d, reason: 'already exists' }));
    return;
  }

  const root = scanRoot || dirname(vaultRoot);
  const commits = getGitCommits(root, d);

  // Group commits by repo
  const byRepo = {};
  for (const c of commits) {
    if (!byRepo[c.repo]) byRepo[c.repo] = [];
    byRepo[c.repo].push(c.message);
  }

  let records = '';
  for (const [repo, msgs] of Object.entries(byRepo)) {
    const unique = [...new Set(msgs)];
    if (unique.length <= 3) {
      records += unique.map(m => `- ${repo}: ${m}`).join('\n') + '\n';
    } else {
      records += `- ${repo}: ${unique.length} commits (${unique[0]}...)\n`;
    }
  }
  if (!records.trim()) records = '- (No git activity)\n';

  const content = tpl.render('journal', {
    DATE: d,
    WEEKDAY: weekdayShort(d),
    PREV_DATE: prevDate(d),
    NEXT_DATE: nextDate(d),
  }).replace(/-\n\n## 想法/, `${records.trim()}\n\n## 想法`)
    .replace(/-\n\n## Ideas/, `${records.trim()}\n\n## Ideas`);

  vault.write('journal', `${d}.md`, content);
  const summary = commits.length > 0
    ? `${commits.length} commits across ${new Set(commits.map(c => c.repo)).size} repos`
    : 'No git activity';
  idx.updateDirIndex('journal', d, summary);
  idx.sync();

  notify('obsidian-agent', `Backfill ${d}: ${commits.length} commits`);
  console.log(JSON.stringify({ status: 'created', date: d, commits: commits.length }));
}
