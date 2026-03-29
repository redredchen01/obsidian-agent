import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '..', 'tmp', 'test-mcp');

describe('McpServer', () => {
  let server;

  before(async () => {
    rmSync(TMP, { recursive: true, force: true });
    // Initialize a vault via init
    const { init } = await import('../src/commands/init.mjs');
    init(TMP);

    const { McpServer } = await import('../src/mcp-server.mjs');
    server = new McpServer(TMP);
  });

  after(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it('initialize returns server info', () => {
    const res = server.handleMessage({
      jsonrpc: '2.0', id: 1,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05' },
    });
    assert.equal(res.result.serverInfo.name, 'obsidian-agent');
    assert.ok(res.result.protocolVersion);
  });

  it('notifications/initialized returns null', () => {
    const res = server.handleMessage({
      jsonrpc: '2.0', id: 2,
      method: 'notifications/initialized',
      params: {},
    });
    assert.equal(res, null);
  });

  it('tools/list returns all tools', () => {
    const res = server.handleMessage({
      jsonrpc: '2.0', id: 3,
      method: 'tools/list',
      params: {},
    });
    const toolNames = res.result.tools.map(t => t.name);
    assert.ok(toolNames.includes('journal'));
    assert.ok(toolNames.includes('note'));
    assert.ok(toolNames.includes('search'));
    assert.ok(toolNames.includes('health'));
    assert.ok(toolNames.includes('sync'));
    assert.ok(toolNames.includes('tag_list'));
    assert.ok(toolNames.includes('tag_rename'));
  });

  it('tools/call journal creates entry', async () => {
    const res = await server.handleMessage({
      jsonrpc: '2.0', id: 4,
      method: 'tools/call',
      params: { name: 'journal', arguments: {} },
    });
    assert.ok(res.result.content[0].text.includes('created'));
  });

  it('tools/call note creates a note', async () => {
    const res = await server.handleMessage({
      jsonrpc: '2.0', id: 5,
      method: 'tools/call',
      params: { name: 'note', arguments: { title: 'MCP Test Note', type: 'idea' } },
    });
    assert.ok(res.result.content[0].text.includes('created'));
    assert.ok(existsSync(join(TMP, 'ideas', 'mcp-test-note.md')));
  });

  it('tools/call search works', async () => {
    const res = await server.handleMessage({
      jsonrpc: '2.0', id: 6,
      method: 'tools/call',
      params: { name: 'search', arguments: { keyword: 'MCP' } },
    });
    const data = JSON.parse(res.result.content[0].text);
    assert.ok(data.results.length >= 1);
  });

  it('tools/call stats returns vault stats', async () => {
    const res = await server.handleMessage({
      jsonrpc: '2.0', id: 7,
      method: 'tools/call',
      params: { name: 'stats', arguments: {} },
    });
    const data = JSON.parse(res.result.content[0].text);
    assert.ok(data.total >= 1);
  });

  it('tools/call health returns scoring', async () => {
    const res = await server.handleMessage({
      jsonrpc: '2.0', id: 8,
      method: 'tools/call',
      params: { name: 'health', arguments: {} },
    });
    const data = JSON.parse(res.result.content[0].text);
    assert.ok(data.overall >= 0);
    assert.ok(['A', 'B', 'C', 'D', 'F'].includes(data.grade));
  });

  it('tools/call sync rebuilds indices', async () => {
    const res = await server.handleMessage({
      jsonrpc: '2.0', id: 9,
      method: 'tools/call',
      params: { name: 'sync', arguments: {} },
    });
    const data = JSON.parse(res.result.content[0].text);
    assert.ok(typeof data.tags === 'number');
    assert.ok(typeof data.notes === 'number');
  });

  it('tools/call with unknown tool returns error', async () => {
    const res = await server.handleMessage({
      jsonrpc: '2.0', id: 10,
      method: 'tools/call',
      params: { name: 'nonexistent', arguments: {} },
    });
    assert.ok(res.error);
    assert.equal(res.error.code, -32000);
  });

  it('unknown method returns method not found', () => {
    const res = server.handleMessage({
      jsonrpc: '2.0', id: 11,
      method: 'nonexistent/method',
      params: {},
    });
    assert.equal(res.error.code, -32601);
  });
});
