import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { isValidDate } from '../src/dates.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '..', 'tmp', 'test-validation');

describe('isValidDate', () => {
  it('accepts valid dates', () => {
    assert.equal(isValidDate('2026-03-27'), true);
    assert.equal(isValidDate('2020-01-01'), true);
    assert.equal(isValidDate('2026-12-31'), true);
  });

  it('rejects invalid format', () => {
    assert.equal(isValidDate('2026/03/27'), false);
    assert.equal(isValidDate('27-03-2026'), false);
    assert.equal(isValidDate('March 27'), false);
    assert.equal(isValidDate('2026-3-7'), false);
    assert.equal(isValidDate(''), false);
  });

  it('rejects non-string input', () => {
    assert.equal(isValidDate(null), false);
    assert.equal(isValidDate(undefined), false);
    assert.equal(isValidDate(12345), false);
  });

  it('rejects impossible dates', () => {
    assert.equal(isValidDate('2026-02-30'), false);
    assert.equal(isValidDate('2026-13-01'), false);
    assert.equal(isValidDate('2026-00-15'), false);
    assert.equal(isValidDate('2026-04-31'), false);
  });
});

describe('journal date validation', () => {
  before(() => {
    rmSync(TMP, { recursive: true, force: true });
    mkdirSync(join(TMP, 'journal'), { recursive: true });
    mkdirSync(join(TMP, 'templates'), { recursive: true });
    writeFileSync(join(TMP, '_index.md'), '# Index\n');
    writeFileSync(join(TMP, 'AGENT.md'), '# Agent\n');
  });

  after(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it('rejects invalid date arg', async () => {
    const { journal } = await import('../src/commands/journal.mjs');
    assert.throws(() => journal(TMP, { date: 'not-a-date' }), /Invalid date/);
  });

  it('rejects impossible date', async () => {
    const { journal } = await import('../src/commands/journal.mjs');
    assert.throws(() => journal(TMP, { date: '2026-02-30' }), /Invalid date/);
  });
});

describe('note filename validation', () => {
  before(() => {
    rmSync(TMP, { recursive: true, force: true });
    mkdirSync(join(TMP, 'projects'), { recursive: true });
    mkdirSync(join(TMP, 'ideas'), { recursive: true });
    mkdirSync(join(TMP, 'templates'), { recursive: true });
    writeFileSync(join(TMP, '_index.md'), '# Index\n');
  });

  after(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it('rejects title that produces empty filename', async () => {
    const { note } = await import('../src/commands/note.mjs');
    assert.throws(() => note(TMP, '!!!', 'project'), /valid filename/);
  });

  it('rejects invalid type', async () => {
    const { note } = await import('../src/commands/note.mjs');
    assert.throws(() => note(TMP, 'Test', 'invalid-type'), /Invalid type/);
  });
});

describe('capture filename fallback', () => {
  before(() => {
    rmSync(TMP, { recursive: true, force: true });
    mkdirSync(join(TMP, 'ideas'), { recursive: true });
    mkdirSync(join(TMP, 'templates'), { recursive: true });
    writeFileSync(join(TMP, '_index.md'), '# Index\n');
  });

  after(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it('creates note even for special-char-only input', async () => {
    const { capture } = await import('../src/commands/capture.mjs');
    const result = capture(TMP, '!!! @@@');
    assert.equal(result.status, 'created');
    // Falls back to "Untitled idea" → "untitled-idea" or timestamp-based filename
    assert.ok(result.file.startsWith('ideas/'));
    assert.ok(existsSync(join(TMP, result.file)));
  });
});
