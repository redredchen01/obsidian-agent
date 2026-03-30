import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '..', 'tmp', 'test-canvas');

describe('canvas commands', () => {
  before(() => {
    rmSync(TMP, { recursive: true, force: true });
    mkdirSync(TMP, { recursive: true });
  });

  after(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it('creates a canvas file', async () => {
    const { canvasCreate } = await import('../src/commands/canvas.mjs');
    const result = canvasCreate(TMP, 'test-board');
    assert.strictEqual(result.status, 'created');
    assert.ok(existsSync(join(TMP, 'test-board.canvas')));
  });

  it('detects existing canvas', async () => {
    const { canvasCreate } = await import('../src/commands/canvas.mjs');
    const result = canvasCreate(TMP, 'test-board');
    assert.strictEqual(result.status, 'exists');
  });

  it('reads a canvas file', async () => {
    const { canvasRead } = await import('../src/commands/canvas.mjs');
    const data = canvasRead(TMP, 'test-board');
    assert.ok(Array.isArray(data.nodes));
    assert.ok(Array.isArray(data.edges));
  });

  it('adds a text node', async () => {
    const { canvasAddNode } = await import('../src/commands/canvas.mjs');
    const result = canvasAddNode(TMP, 'test-board', { type: 'text', text: 'Hello World' });
    assert.strictEqual(result.status, 'added');
    assert.strictEqual(result.type, 'text');
    assert.ok(result.nodeId);
  });

  it('adds a file node', async () => {
    const { canvasAddNode } = await import('../src/commands/canvas.mjs');
    const result = canvasAddNode(TMP, 'test-board', { type: 'file', file: 'notes/my-note.md' });
    assert.strictEqual(result.type, 'file');
  });

  it('adds a link node', async () => {
    const { canvasAddNode } = await import('../src/commands/canvas.mjs');
    const result = canvasAddNode(TMP, 'test-board', { type: 'link', url: 'https://example.com' });
    assert.strictEqual(result.type, 'link');
  });

  it('adds a group node', async () => {
    const { canvasAddNode } = await import('../src/commands/canvas.mjs');
    const result = canvasAddNode(TMP, 'test-board', { type: 'group', label: 'My Group' });
    assert.strictEqual(result.type, 'group');
  });

  it('adds an edge', async () => {
    const { canvasRead, canvasAddEdge } = await import('../src/commands/canvas.mjs');
    const data = canvasRead(TMP, 'test-board');
    const n1 = data.nodes[0].id;
    const n2 = data.nodes[1].id;
    const result = canvasAddEdge(TMP, 'test-board', { from: n1, to: n2, label: 'connects' });
    assert.strictEqual(result.status, 'added');
    assert.strictEqual(result.from, n1);
    assert.strictEqual(result.to, n2);
  });

  it('canvas has correct structure after operations', async () => {
    const { canvasRead } = await import('../src/commands/canvas.mjs');
    const data = canvasRead(TMP, 'test-board');
    assert.strictEqual(data.nodes.length, 4);
    assert.strictEqual(data.edges.length, 1);
    // Verify node types
    const types = data.nodes.map(n => n.type);
    assert.ok(types.includes('text'));
    assert.ok(types.includes('file'));
    assert.ok(types.includes('link'));
    assert.ok(types.includes('group'));
  });

  it('auto-creates canvas when adding nodes', async () => {
    const { canvasAddNode } = await import('../src/commands/canvas.mjs');
    canvasAddNode(TMP, 'auto-created', { type: 'text', text: 'Auto created' });
    assert.ok(existsSync(join(TMP, 'auto-created.canvas')));
  });

  it('throws on missing canvas for read', async () => {
    const { canvasRead } = await import('../src/commands/canvas.mjs');
    assert.throws(() => canvasRead(TMP, 'nonexistent'), /not found/);
  });
});
