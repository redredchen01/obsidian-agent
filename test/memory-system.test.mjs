/**
 * Tests for MemoryGraph, SessionMemory, and MemoryBridge
 */
import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import { tmpdir } from 'os';

import { MemoryGraph } from '../src/memory-graph.mjs';
import { SessionMemory } from '../src/session-memory.mjs';
import { MemoryBridge } from '../src/memory-bridge.mjs';
import { Vault } from '../src/vault.mjs';

const TEST_DIR = resolve(tmpdir(), `clausidian-test-memory-${Date.now()}`);

function createTestVault() {
  const vaultRoot = join(TEST_DIR, `vault-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(vaultRoot, { recursive: true });
  mkdirSync(join(vaultRoot, 'areas'), { recursive: true });
  mkdirSync(join(vaultRoot, 'projects'), { recursive: true });
  mkdirSync(join(vaultRoot, 'resources'), { recursive: true });
  mkdirSync(join(vaultRoot, 'journal'), { recursive: true });
  mkdirSync(join(vaultRoot, 'ideas'), { recursive: true });

  // Create test notes
  writeFileSync(join(vaultRoot, 'projects', 'api-project.md'), `---
title: "API Project"
type: project
tags: [backend, api]
created: 2026-04-01
updated: 2026-04-01
status: active
summary: "Build REST API"
related: ["[[backend-dev]]"]
---

# API Project

Building a REST API for the platform.
`);

  writeFileSync(join(vaultRoot, 'areas', 'backend-dev.md'), `---
title: "Backend Dev"
type: area
tags: [backend, architecture]
created: 2026-04-01
updated: 2026-04-01
status: active
summary: "Backend development focus"
related: ["[[api-project]]"]
---

# Backend Development

Focus on backend architecture.
`);

  writeFileSync(join(vaultRoot, 'resources', 'node-docs.md'), `---
title: "Node Docs"
type: resource
tags: [backend, nodejs]
created: 2026-04-01
updated: 2026-04-01
status: active
summary: "Node.js documentation"
related: []
---

# Node.js Documentation
`);

  writeFileSync(join(vaultRoot, 'ideas', 'cool-idea.md'), `---
title: "Cool Idea"
type: idea
tags: [backend, optimization]
created: 2026-04-01
updated: 2026-04-01
status: draft
summary: "Optimize database queries"
related: []
---

# Cool Idea

Maybe we can optimize the DB queries.
`);

  return vaultRoot;
}

// ═══════════════════════════════════════════════════════
// MemoryGraph Tests
// ═══════════════════════════════════════════════════════

describe('MemoryGraph', () => {
  let vaultRoot;
  let vault;

  beforeEach(() => {
    vaultRoot = createTestVault();
    vault = new Vault(vaultRoot);
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should create graph and add nodes', () => {
    const graph = new MemoryGraph(vault);
    const node = graph.addNode('test-1', 'project', 'Test Project', { tags: ['test'] });

    assert.ok(node);
    assert.strictEqual(node.type, 'project');
    assert.strictEqual(node.label, 'Test Project');
    assert.strictEqual(graph.nodes.size, 1);
  });

  it('should add edges between nodes', () => {
    const graph = new MemoryGraph(vault);
    graph.addNode('node-a', 'project', 'Project A');
    graph.addNode('node-b', 'area', 'Area B');

    const edge = graph.addEdge('node-a', 'node-b', 'related', 1.5);

    assert.ok(edge);
    assert.strictEqual(edge.source, 'node-a');
    assert.strictEqual(edge.target, 'node-b');
    assert.strictEqual(edge.weight, 1.5);
    assert.strictEqual(graph.edges.size, 1);
  });

  it('should reinforce existing edges', () => {
    const graph = new MemoryGraph(vault);
    graph.addNode('node-a', 'project', 'Project A');
    graph.addNode('node-b', 'area', 'Area B');

    graph.addEdge('node-a', 'node-b', 'related', 1.0);
    graph.addEdge('node-a', 'node-b', 'related', 1.0);

    const key = graph._edgeKey('node-a', 'node-b');
    const edge = graph.edges.get(key);
    assert.ok(edge.weight > 1.0, 'Edge should be reinforced');
  });

  it('should get neighbors by depth', () => {
    const graph = new MemoryGraph(vault);
    graph.addNode('a', 'project', 'A');
    graph.addNode('b', 'area', 'B');
    graph.addNode('c', 'resource', 'C');

    graph.addEdge('a', 'b', 'related', 1.0);
    graph.addEdge('b', 'c', 'related', 1.0);

    const neighbors1 = graph.getNeighbors('a', 1);
    assert.strictEqual(neighbors1.length, 1);
    assert.strictEqual(neighbors1[0].id, 'b');

    const neighbors2 = graph.getNeighbors('a', 2);
    assert.strictEqual(neighbors2.length, 2);
  });

  it('should query context', () => {
    const graph = new MemoryGraph(vault);
    graph.addNode('api', 'project', 'API Project', { tags: ['backend', 'api'] });
    graph.addNode('backend', 'area', 'Backend', { tags: ['backend'] });
    graph.addNode('frontend', 'resource', 'Frontend', { tags: ['frontend'] });

    graph.addEdge('api', 'backend', 'tag-similar', 1.0);

    const results = graph.queryContext(['api']);
    assert.ok(results.length > 0);
    assert.ok(results.some(r => r.id === 'api'));
  });

  it('should get strongest connections', () => {
    const graph = new MemoryGraph(vault);
    graph.addNode('center', 'project', 'Center');
    graph.addNode('weak', 'area', 'Weak');
    graph.addNode('strong', 'resource', 'Strong');

    graph.addEdge('center', 'weak', 'related', 0.5);
    graph.addEdge('center', 'strong', 'related', 3.0);

    const connections = graph.getStrongestConnections('center', 2);
    assert.strictEqual(connections[0].id, 'strong');
    assert.strictEqual(connections[1].id, 'weak');
  });

  it('should sync from vault', () => {
    const graph = new MemoryGraph(vault);
    const result = graph.syncFromVault();

    assert.ok(result.added > 0);
    assert.ok(result.total >= 4);
    assert.ok(graph.nodes.has('api-project'));
    assert.ok(graph.nodes.has('backend-dev'));
  });

  it('should apply decay to node weights', () => {
    const graph = new MemoryGraph(vault);
    const node = graph.addNode('old-node', 'project', 'Old', { ephemeral: true });
    node.lastAccess = new Date(Date.now() - 7 * 86400000).toISOString(); // 7 days ago
    const originalWeight = node.weight;

    graph.applyDecay();
    assert.ok(node.weight < originalWeight, 'Weight should decay');
    assert.ok(node.weight >= 0.01, 'Weight should not go below floor');
  });

  it('should promote memories', () => {
    const graph = new MemoryGraph(vault);
    const node = graph.addNode('pop', 'project', 'Popular', { ephemeral: true });
    node.accessCount = 5; // Above threshold

    const promoted = graph.promoteMemories();
    assert.ok(promoted.includes('pop'));
    assert.strictEqual(node.metadata.ephemeral, false);
  });

  it('should get stats', () => {
    const graph = new MemoryGraph(vault);
    graph.addNode('a', 'project', 'A');
    graph.addNode('b', 'area', 'B');
    graph.addEdge('a', 'b', 'related', 1.0);

    const stats = graph.getStats();
    assert.strictEqual(stats.nodes, 2);
    assert.strictEqual(stats.edges, 1);
    assert.ok(stats.nodesByType.project);
    assert.ok(stats.nodesByType.area);
  });

  it('should remove nodes and clean edges', () => {
    const graph = new MemoryGraph(vault);
    graph.addNode('a', 'project', 'A');
    graph.addNode('b', 'area', 'B');
    graph.addEdge('a', 'b', 'related', 1.0);

    graph.removeNode('a');

    assert.strictEqual(graph.nodes.size, 1);
    assert.strictEqual(graph.edges.size, 0);
    assert.ok(!graph.nodes.has('a'));
  });
});

// ═══════════════════════════════════════════════════════
// SessionMemory Tests
// ═══════════════════════════════════════════════════════

describe('SessionMemory', () => {
  let vaultRoot;
  let vault;

  beforeEach(() => {
    vaultRoot = createTestVault();
    vault = new Vault(vaultRoot);
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should start and end a session', () => {
    const sessions = new SessionMemory(vault);
    const session = sessions.startSession({ topic: 'testing' });

    assert.ok(session.id);
    assert.strictEqual(session.state, 'active');
    assert.strictEqual(session.context.topic, 'testing');

    const ended = sessions.endSession({
      decisions: ['Use Jest'],
      learnings: ['Tests are important'],
    });

    assert.strictEqual(ended.state, 'completed');
    assert.ok(ended.decisions.length > 0);
    assert.ok(ended.learnings.length > 0);
  });

  it('should record events', () => {
    const sessions = new SessionMemory(vault);
    sessions.startSession({ topic: 'testing' });

    sessions.recordEvent('note:created', { note: 'new-note' });
    sessions.recordEvent('search:executed', { query: 'test' });

    assert.strictEqual(sessions.currentSession.events.length, 2);
    assert.strictEqual(sessions.currentSession.metrics.notesCreated, 1);
    assert.strictEqual(sessions.currentSession.metrics.searchesPerformed, 1);
  });

  it('should record decisions and learnings', () => {
    const sessions = new SessionMemory(vault);
    sessions.startSession();

    sessions.recordDecision('Use TypeScript');
    sessions.recordLearning('Always write tests first');
    sessions.recordNextStep('Implement auth');

    assert.strictEqual(sessions.currentSession.decisions.length, 1);
    assert.strictEqual(sessions.currentSession.learnings.length, 1);
    assert.strictEqual(sessions.currentSession.nextSteps.length, 1);
  });

  it('should persist and retrieve sessions', () => {
    const sessions = new SessionMemory(vault);
    const session = sessions.startSession({ topic: 'persist-test' });
    const sessionId = session.id;
    sessions.endSession();

    const retrieved = sessions.getSession(sessionId);
    assert.ok(retrieved);
    assert.strictEqual(retrieved.id, sessionId);
    assert.strictEqual(retrieved.context.topic, 'persist-test');
  });

  it('should get recent sessions', () => {
    const sessions = new SessionMemory(vault);

    sessions.startSession({ topic: 'session-1' });
    sessions.endSession();
    sessions.startSession({ topic: 'session-2' });
    sessions.endSession();

    const recent = sessions.getRecentSessions(1);
    assert.strictEqual(recent.length, 2);
  });

  it('should get pending steps', () => {
    const sessions = new SessionMemory(vault);
    sessions.startSession();
    sessions.recordNextStep('Fix the bug');
    sessions.endSession();

    const pending = sessions.getPendingSteps();
    assert.ok(pending.length > 0);
    assert.ok(pending.some(s => s.step === 'Fix the bug'));
  });

  it('should aggregate learnings', () => {
    const sessions = new SessionMemory(vault);

    sessions.startSession();
    sessions.recordLearning('Write tests first');
    sessions.endSession();

    sessions.startSession();
    sessions.recordLearning('Write tests first');
    sessions.endSession();

    const learnings = sessions.getAggregatedLearnings();
    assert.ok(learnings.length > 0);
    assert.strictEqual(learnings[0].count, 2);
  });

  it('should build context window', () => {
    const sessions = new SessionMemory(vault);
    sessions.startSession({ topic: 'context-test', activeNotes: ['api-project'] });
    sessions.recordDecision('Use Fastify');
    sessions.recordLearning('Fastify is fast');
    sessions.endSession();

    const context = sessions.buildContextWindow({ topic: 'context-test' });
    assert.ok(context.length > 0);
  });

  it('should cleanup old sessions', () => {
    const sessions = new SessionMemory(vault, null, { maxSessions: 2 });

    for (let i = 0; i < 5; i++) {
      sessions.startSession();
      sessions.endSession();
    }

    const cleanup = sessions.cleanup();
    const remaining = sessions.getRecentSessions(365);
    assert.ok(remaining.length <= 3); // maxSessions + current
  });

  it('should get stats', () => {
    const sessions = new SessionMemory(vault);

    sessions.startSession({ topic: 'stats-test' });
    sessions.recordDecision('Decision 1');
    sessions.recordLearning('Learning 1');
    sessions.endSession();

    const stats = sessions.getStats();
    assert.ok(stats.totalSessions >= 1);
    assert.ok(stats.totalDecisions >= 1);
    assert.ok(stats.totalLearnings >= 1);
  });
});

// ═══════════════════════════════════════════════════════
// MemoryBridge Tests
// ═══════════════════════════════════════════════════════

describe('MemoryBridge', () => {
  let vaultRoot;
  let vault;

  beforeEach(() => {
    vaultRoot = createTestVault();
    vault = new Vault(vaultRoot);
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('should create bridge with graph and sessions', () => {
    const bridge = new MemoryBridge(vault);

    assert.ok(bridge.graph);
    assert.ok(bridge.sessions);
    assert.strictEqual(bridge.state.syncCount, 0);
  });

  it('should full sync vault to graph', async () => {
    const bridge = new MemoryBridge(vault);

    const result = await bridge.fullSync();

    assert.ok(result.graphSync);
    assert.ok(result.graphSync.added > 0);
    assert.ok(bridge.graph.nodes.size > 0);
  });

  it('should query unified context', () => {
    const bridge = new MemoryBridge(vault);
    bridge.fullSync();

    const result = bridge.queryContext('api');

    assert.ok(result.graph || result.vault);
    assert.ok(result.combined);
  });

  it('should get diagnostics', () => {
    const bridge = new MemoryBridge(vault);
    bridge.fullSync();

    const diag = bridge.getDiagnostics();

    assert.ok(diag.version);
    assert.ok(diag.graph);
    assert.ok(diag.sessions);
    assert.ok(diag.config);
  });

  it('should run maintenance', () => {
    const bridge = new MemoryBridge(vault);
    bridge.fullSync();

    const result = bridge.maintenance();

    assert.ok(result.graphStats);
    assert.ok(result.sessionCleanup);
  });
});
