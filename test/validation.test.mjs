import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { isValidDate } from '../src/dates.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '..', 'tmp', 'test-validation');

describe('input validation', () => {
  before(() => {
    rmSync(TMP, { recursive: true, force: true });
    // Create a minimal vault for command tests
    const dirs = ['areas', 'projects', 'resources', 'journal', 'ideas', 'templates'];
    for (const d of dirs) mkdirSync(join(TMP, d), { recursive: true });

    writeFileSync(join(TMP, '_index.md'), '---\ntitle: Vault Index\ntype: index\nupdated: 2026-03-27\n---\n');
    writeFileSync(join(TMP, '_tags.md'), '---\ntitle: Tags Index\ntype: index\nupdated: 2026-03-27\n---\n');
    writeFileSync(join(TMP, '_graph.md'), '---\ntitle: Knowledge Graph\ntype: index\nupdated: 2026-03-27\n---\n');
  });

  after(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  // ── Date validation ──

  describe('isValidDate', () => {
    it('accepts valid dates', () => {
      assert.equal(isValidDate('2026-03-27'), true);
      assert.equal(isValidDate('2026-01-01'), true);
      assert.equal(isValidDate('2026-12-31'), true);
    });

    it('rejects invalid formats', () => {
      assert.equal(isValidDate('2026/03/27'), false);
      assert.equal(isValidDate('03-27-2026'), false);
      assert.equal(isValidDate('2026-3-27'), false);
      assert.equal(isValidDate('not-a-date'), false);
      assert.equal(isValidDate(''), false);
      assert.equal(isValidDate(null), false);
      assert.equal(isValidDate(undefined), false);
    });

    it('rejects impossible dates', () => {
      assert.equal(isValidDate('2026-02-30'), false);
      assert.equal(isValidDate('2026-13-01'), false);
      assert.equal(isValidDate('2026-00-01'), false);
    });
  });

  // ── Journal date validation ──

  it('journal rejects invalid date', async () => {
    const { journal } = await import('../src/commands/journal.mjs');
    assert.throws(() => journal(TMP, { date: 'bad-date' }), /Invalid date format/);
  });

  // ── Note empty filename guard ──

  it('note rejects title that produces empty filename', async () => {
    const { note } = await import('../src/commands/note.mjs');
    assert.throws(() => note(TMP, '---', 'project'), /Cannot derive a valid filename/);
  });

  it('note rejects invalid type', async () => {
    const { note } = await import('../src/commands/note.mjs');
    assert.throws(() => note(TMP, 'Test', 'invalid-type'), /Invalid type/);
  });

  // ── Capture fallback filename ──

  it('capture falls back to untitled-idea for empty-producing text', async () => {
    const { capture } = await import('../src/commands/capture.mjs');
    const result = capture(TMP, '---');
    assert.equal(result.status, 'created');
    assert.ok(result.file.includes('untitled-idea'));
  });

  // ── Patch validation ──

  it('patch rejects missing note name', async () => {
    const { patch } = await import('../src/commands/patch.mjs');
    assert.throws(() => patch(TMP, '', { heading: 'Test' }), /Usage/);
  });

  it('patch rejects missing heading', async () => {
    const { patch } = await import('../src/commands/patch.mjs');
    assert.throws(() => patch(TMP, 'some-note', {}), /Usage/);
  });

  // ── Delete validation ──

  it('delete rejects missing note name', async () => {
    const { deleteNote } = await import('../src/commands/delete.mjs');
    assert.throws(() => deleteNote(TMP, ''), /Usage/);
  });

  it('delete rejects nonexistent note', async () => {
    const { deleteNote } = await import('../src/commands/delete.mjs');
    assert.throws(() => deleteNote(TMP, 'nonexistent-note'), /Note not found/);
  });
});
