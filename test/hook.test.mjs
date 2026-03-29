import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '..', 'tmp', 'test-hook');

describe('hook commands', () => {
  before(() => {
    rmSync(TMP, { recursive: true, force: true });
    const dirs = ['areas', 'projects', 'resources', 'journal', 'ideas', 'templates'];
    for (const d of dirs) mkdirSync(join(TMP, d), { recursive: true });

    writeFileSync(join(TMP, '_index.md'), '---\ntitle: Vault Index\ntype: index\nupdated: 2026-03-27\n---\n');
    writeFileSync(join(TMP, '_tags.md'), '---\ntitle: Tags Index\ntype: index\nupdated: 2026-03-27\n---\n');
    writeFileSync(join(TMP, '_graph.md'), '---\ntitle: Knowledge Graph\ntype: index\nupdated: 2026-03-27\n---\n');

    // Copy journal template from scaffold
    const scaffoldTpl = join(__dirname, '..', 'scaffold', 'templates', 'journal.md');
    if (existsSync(scaffoldTpl)) {
      writeFileSync(join(TMP, 'templates', 'journal.md'), readFileSync(scaffoldTpl));
    }
  });

  after(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it('dailyBackfill creates journal entry', async () => {
    const { dailyBackfill } = await import('../src/commands/hook.mjs');
    dailyBackfill(TMP, { date: '2026-03-25', scanRoot: TMP });
    assert.ok(existsSync(join(TMP, 'journal', '2026-03-25.md')));
    const content = readFileSync(join(TMP, 'journal', '2026-03-25.md'), 'utf8');
    assert.ok(content.includes('2026-03-25'));
  });

  it('dailyBackfill skips existing entry', async () => {
    const { dailyBackfill } = await import('../src/commands/hook.mjs');
    // Should not throw — just skip
    dailyBackfill(TMP, { date: '2026-03-25', scanRoot: TMP });
    // Still exists
    assert.ok(existsSync(join(TMP, 'journal', '2026-03-25.md')));
  });

  it('dailyBackfill force overwrites existing entry', async () => {
    const { dailyBackfill } = await import('../src/commands/hook.mjs');
    dailyBackfill(TMP, { date: '2026-03-25', scanRoot: TMP, force: true });
    assert.ok(existsSync(join(TMP, 'journal', '2026-03-25.md')));
  });

  it('dailyBackfill rejects invalid date', async () => {
    const { dailyBackfill } = await import('../src/commands/hook.mjs');
    assert.throws(() => dailyBackfill(TMP, { date: 'nope' }), /Invalid date format/);
  });
});

describe('findGitDirs (cross-platform)', () => {
  const SCAN_ROOT = join(TMP, 'scan-test');

  before(() => {
    rmSync(SCAN_ROOT, { recursive: true, force: true });
    // Create fake git repos
    mkdirSync(join(SCAN_ROOT, 'repo-a', '.git'), { recursive: true });
    mkdirSync(join(SCAN_ROOT, 'repo-b', '.git'), { recursive: true });
    mkdirSync(join(SCAN_ROOT, 'nested', 'repo-c', '.git'), { recursive: true });
    // node_modules should be skipped
    mkdirSync(join(SCAN_ROOT, 'node_modules', 'pkg', '.git'), { recursive: true });
  });

  it('dailyBackfill scans repos without Unix find', async () => {
    const { dailyBackfill } = await import('../src/commands/hook.mjs');
    // This should work on Windows — no Unix find dependency
    dailyBackfill(TMP, { date: '2026-03-20', scanRoot: SCAN_ROOT, force: true });
    assert.ok(existsSync(join(TMP, 'journal', '2026-03-20.md')));
  });
});
