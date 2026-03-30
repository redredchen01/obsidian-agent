import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { McpServer } from '../src/mcp-server.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '..', 'tmp', 'test-mcp');

describe('McpServer', () => {
  let server;

  before(() => {
    rmSync(TMP, { recursive: true, force: true });
    mkdirSync(join(TMP, 'projects'), { recursive: true });
    mkdirSync(join(TMP, 'ideas'), { recursive: true });
    mkdirSync(join(TMP, 'journal'), { recursive: true });
    mkdirSync(join(TMP, 'areas'), { recursive: true });
    mkdirSync(join(TMP, 'resources'), { recursive: true });
    mkdirSync(join(TMP, 'templates'), { recursive: true });
    writeFileSync(join(TMP, '_index.md'), '# Index\n');
    writeFileSync(join(TMP, '_tags.md'), '# Tags\n');
    writeFileSync(join(TMP, '_graph.md'), '# Graph\n');

    writeFileSync(join(TMP, 'projects', 'mcp-test.md'), `---
title: "MCP Test"
type: project
tags: [test, mcp]
created: 2026-03-27
updated: 2026-03-27
status: active
summary: "Test project for MCP"
related: []
---

# MCP Test

Some content here.
`);

    server = new McpServer(TMP);
  });

  after(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  // ── Protocol ──────────────────────────────────────

  it('initialize returns server info', () => {
    const resp = server.handleMessage({
      jsonrpc: '2.0', id: 1,
      method: 'initialize',
      params: { protocolVersion: '2024-11-05' },
    });
    assert.equal(resp.result.serverInfo.name, 'obsidian-agent');
    assert.equal(resp.result.protocolVersion, '2024-11-05');
    assert.ok(resp.result.capabilities.tools);
  });

  it('notifications/initialized returns null', () => {
    const resp = server.handleMessage({
      jsonrpc: '2.0', id: 2,
      method: 'notifications/initialized',
      params: {},
    });
    assert.equal(resp, null);
  });

  it('tools/list returns all 19 tools', () => {
    const resp = server.handleMessage({
      jsonrpc: '2.0', id: 3,
      method: 'tools/list',
      params: {},
    });
    assert.equal(resp.result.tools.length, 21);
    const names = resp.result.tools.map(t => t.name);
    assert.ok(names.includes('journal'));
    assert.ok(names.includes('search'));
    assert.ok(names.includes('capture'));
    assert.ok(names.includes('read'));
    assert.ok(names.includes('health'));
    assert.ok(names.includes('tag_list'));
    assert.ok(names.includes('tag_rename'));
  });

  it('unknown method returns error', () => {
    const resp = server.handleMessage({
      jsonrpc: '2.0', id: 99,
      method: 'unknown/method',
      params: {},
    });
    assert.equal(resp.error.code, -32601);
    assert.ok(resp.error.message.includes('not found'));
  });

  // ── Tool calls ────────────────────────────────────

  it('tools/call search', async () => {
    const resp = await server.handleMessage({
      jsonrpc: '2.0', id: 10,
      method: 'tools/call',
      params: { name: 'search', arguments: { keyword: 'MCP' } },
    });
    const data = JSON.parse(resp.result.content[0].text);
    assert.ok(data.results.length >= 1);
    assert.ok(data.results.some(r => r.file === 'mcp-test'));
  });

  it('tools/call stats', async () => {
    const resp = await server.handleMessage({
      jsonrpc: '2.0', id: 11,
      method: 'tools/call',
      params: { name: 'stats', arguments: {} },
    });
    const data = JSON.parse(resp.result.content[0].text);
    assert.ok(data.total >= 1);
  });

  it('tools/call read', async () => {
    const resp = await server.handleMessage({
      jsonrpc: '2.0', id: 12,
      method: 'tools/call',
      params: { name: 'read', arguments: { note: 'mcp-test' } },
    });
    const data = JSON.parse(resp.result.content[0].text);
    assert.ok(data.content.includes('MCP Test'));
  });

  it('tools/call list', async () => {
    const resp = await server.handleMessage({
      jsonrpc: '2.0', id: 13,
      method: 'tools/call',
      params: { name: 'list', arguments: { type: 'project' } },
    });
    const data = JSON.parse(resp.result.content[0].text);
    assert.ok(data.notes.length >= 1);
  });

  it('tools/call capture', async () => {
    const resp = await server.handleMessage({
      jsonrpc: '2.0', id: 14,
      method: 'tools/call',
      params: { name: 'capture', arguments: { idea: 'Test idea from MCP' } },
    });
    const data = JSON.parse(resp.result.content[0].text);
    assert.equal(data.status, 'created');
  });

  it('tools/call journal', async () => {
    const resp = await server.handleMessage({
      jsonrpc: '2.0', id: 15,
      method: 'tools/call',
      params: { name: 'journal', arguments: { date: '2026-01-15' } },
    });
    const data = JSON.parse(resp.result.content[0].text);
    assert.equal(data.status, 'created');
    assert.equal(data.date, '2026-01-15');
  });

  it('tools/call backlinks', async () => {
    const resp = await server.handleMessage({
      jsonrpc: '2.0', id: 16,
      method: 'tools/call',
      params: { name: 'backlinks', arguments: { note: 'mcp-test' } },
    });
    const data = JSON.parse(resp.result.content[0].text);
    assert.ok(Array.isArray(data.results));
  });

  it('tools/call orphans', async () => {
    const resp = await server.handleMessage({
      jsonrpc: '2.0', id: 17,
      method: 'tools/call',
      params: { name: 'orphans', arguments: {} },
    });
    const data = JSON.parse(resp.result.content[0].text);
    assert.ok(Array.isArray(data.results));
  });

  it('tools/call health', async () => {
    const resp = await server.handleMessage({
      jsonrpc: '2.0', id: 18,
      method: 'tools/call',
      params: { name: 'health', arguments: {} },
    });
    const data = JSON.parse(resp.result.content[0].text);
    assert.ok(data.overall >= 0 && data.overall <= 100);
    assert.ok(data.scores);
  });

  it('tools/call graph', async () => {
    const resp = await server.handleMessage({
      jsonrpc: '2.0', id: 19,
      method: 'tools/call',
      params: { name: 'graph', arguments: {} },
    });
    const data = JSON.parse(resp.result.content[0].text);
    assert.ok(data.mermaid.includes('graph LR'));
  });

  it('tools/call sync', async () => {
    const resp = await server.handleMessage({
      jsonrpc: '2.0', id: 20,
      method: 'tools/call',
      params: { name: 'sync', arguments: {} },
    });
    const data = JSON.parse(resp.result.content[0].text);
    assert.ok(data.tags >= 0);
  });

  it('tools/call update', async () => {
    const resp = await server.handleMessage({
      jsonrpc: '2.0', id: 21,
      method: 'tools/call',
      params: { name: 'update', arguments: { note: 'mcp-test', summary: 'Updated via MCP' } },
    });
    const data = JSON.parse(resp.result.content[0].text);
    assert.equal(data.status, 'updated');
  });

  it('tools/call tag_list', async () => {
    const resp = await server.handleMessage({
      jsonrpc: '2.0', id: 22,
      method: 'tools/call',
      params: { name: 'tag_list', arguments: {} },
    });
    const data = JSON.parse(resp.result.content[0].text);
    assert.ok(data.tags);
  });

  it('tools/call unknown tool returns error', async () => {
    const resp = await server.handleMessage({
      jsonrpc: '2.0', id: 50,
      method: 'tools/call',
      params: { name: 'nonexistent', arguments: {} },
    });
    assert.ok(resp.error);
    assert.equal(resp.error.code, -32000);
  });

  it('cache invalidates between calls', async () => {
    // First call: capture an idea
    await server.handleMessage({
      jsonrpc: '2.0', id: 30,
      method: 'tools/call',
      params: { name: 'capture', arguments: { idea: 'Cache invalidation test' } },
    });
    // Second call: search should find it
    const resp = await server.handleMessage({
      jsonrpc: '2.0', id: 31,
      method: 'tools/call',
      params: { name: 'search', arguments: { keyword: 'Cache invalidation' } },
    });
    const data = JSON.parse(resp.result.content[0].text);
    assert.ok(data.results.length >= 1);
  });
});
