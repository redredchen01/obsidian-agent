import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '..', 'tmp', 'test-hook');

describe('hook — findGitDirs (cross-platform)', () => {
  before(() => {
    rmSync(TMP, { recursive: true, force: true });
    // Create fake repo structures
    mkdirSync(join(TMP, 'scan', 'repo-a', '.git'), { recursive: true });
    mkdirSync(join(TMP, 'scan', 'repo-b', '.git'), { recursive: true });
    mkdirSync(join(TMP, 'scan', 'not-a-repo'), { recursive: true });
    mkdirSync(join(TMP, 'scan', 'nested', 'repo-c', '.git'), { recursive: true });
  });

  after(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it('finds .git dirs recursively without Unix find', async () => {
    // We test the internal function indirectly via module
    // Import the hook module and test getGitCommits with a scan root
    // that has no actual git repos (empty .git dirs → no commits)
    const { dailyBackfill } = await import('../src/commands/hook.mjs');

    // Setup minimal vault
    mkdirSync(join(TMP, 'vault', 'journal'), { recursive: true });
    mkdirSync(join(TMP, 'vault', 'templates'), { recursive: true });
    writeFileSync(join(TMP, 'vault', '_index.md'), '# Index\n');
    writeFileSync(join(TMP, 'vault', 'AGENT.md'), '# Agent\n');

    // Run daily-backfill — won't find real commits but exercises the scanner
    dailyBackfill(join(TMP, 'vault'), {
      date: '2026-03-27',
      scanRoot: join(TMP, 'scan'),
      force: true,
    });

    assert.ok(existsSync(join(TMP, 'vault', 'journal', '2026-03-27.md')));
    const content = readFileSync(join(TMP, 'vault', 'journal', '2026-03-27.md'), 'utf8');
    assert.ok(content.includes('2026-03-27'));
  });

  it('dailyBackfill skips existing journal unless force', async () => {
    const { dailyBackfill } = await import('../src/commands/hook.mjs');
    // Journal already exists from previous test
    const origLog = console.log;
    let output = '';
    console.log = (msg) => { output += msg; };
    dailyBackfill(join(TMP, 'vault'), {
      date: '2026-03-27',
      scanRoot: join(TMP, 'scan'),
    });
    console.log = origLog;
    assert.ok(output.includes('skip') || output.includes('already exists'));
  });

  it('dailyBackfill rejects invalid date', async () => {
    const { dailyBackfill } = await import('../src/commands/hook.mjs');
    assert.throws(
      () => dailyBackfill(join(TMP, 'vault'), { date: 'bad-date' }),
      /Invalid date/
    );
  });
});
