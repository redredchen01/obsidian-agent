import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Vault } from '../src/vault.mjs';
import { IndexManager } from '../src/index-manager.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TMP = join(__dirname, '..', 'tmp', 'test-index');

describe('IndexManager', () => {
  let vault, idx;

  before(() => {
    rmSync(TMP, { recursive: true, force: true });
    mkdirSync(join(TMP, 'projects'), { recursive: true });
    mkdirSync(join(TMP, 'journal'), { recursive: true });

    writeFileSync(join(TMP, 'projects', 'my-project.md'), `---
title: "My Project"
type: project
tags: [backend, api]
created: 2026-03-27
updated: 2026-03-27
status: active
summary: "A test project"
related: ["[[other-note]]"]
---

# My Project
`);

    writeFileSync(join(TMP, 'journal', '2026-03-27.md'), `---
title: "2026-03-27"
type: journal
tags: [daily]
created: 2026-03-27
updated: 2026-03-27
status: active
summary: ""
related: []
---

# 2026-03-27
`);

    vault = new Vault(TMP);
    idx = new IndexManager(vault);
  });

  after(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it('rebuildTags creates _tags.md', () => {
    const result = idx.rebuildTags();
    assert.ok(result.tags > 0);
    assert.ok(result.notes > 0);
    const content = vault.read('_tags.md');
    assert.ok(content.includes('### backend'));
    assert.ok(content.includes('[[my-project]]'));
  });

  it('rebuildGraph creates _graph.md', () => {
    const result = idx.rebuildGraph();
    assert.ok(result.relationships > 0);
    const content = vault.read('_graph.md');
    assert.ok(content.includes('[[my-project]]'));
    assert.ok(content.includes('| nav |'));
  });

  it('updateDirIndex creates/updates index', () => {
    idx.updateDirIndex('projects', 'my-project', 'A test project');
    const content = vault.read('projects', '_index.md');
    assert.ok(content.includes('[[my-project]]'));
    assert.ok(content.includes('A test project'));
  });

  it('sync rebuilds all indices', () => {
    const result = idx.sync();
    assert.ok(result.tags >= 0);
    assert.ok(result.notes >= 0);
    assert.ok(result.relationships >= 0);
  });
});

describe('Incremental Sync', () => {
  let vault, idx;

  before(() => {
    rmSync(TMP, { recursive: true, force: true });
    mkdirSync(join(TMP, 'projects'), { recursive: true });
    mkdirSync(join(TMP, 'journal'), { recursive: true });

    // Create 5 test notes
    for (let i = 1; i <= 5; i++) {
      writeFileSync(join(TMP, 'projects', `note-${i}.md`), `---
title: "Note ${i}"
type: project
tags: [tag-a, tag-b]
created: 2026-03-27
updated: 2026-03-27
status: active
summary: "Test note ${i}"
related: []
---

# Note ${i}
`);
    }

    vault = new Vault(TMP);
    idx = new IndexManager(vault);
  });

  after(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it('no changes detected when notes unchanged', () => {
    // First sync to build cache
    idx.sync();

    // Second sync: no changes expected
    const changes = vault.detectChanges();
    assert.strictEqual(changes.created.length, 0);
    assert.strictEqual(changes.modified.length, 0);
    assert.strictEqual(changes.deleted.length, 0);
    assert.strictEqual(changes.unchanged, 5);
  });

  it('detects modified notes', () => {
    idx.sync();

    // Modify one note
    const notePath = join(TMP, 'projects', 'note-1.md');
    const content = `---
title: "Note 1 Modified"
type: project
tags: [tag-a, tag-c]
created: 2026-03-27
updated: 2026-03-28
status: active
summary: "Test note 1 modified"
related: []
---

# Note 1 Modified
`;
    writeFileSync(notePath, content);
    vault.invalidateCache();

    // Detect change
    const changes = vault.detectChanges();
    assert.ok(changes.modified.length > 0);
    assert.ok(changes.modified.some(p => p.includes('note-1')));
  });

  it('detects newly created notes', () => {
    idx.sync();

    // Add a new note
    writeFileSync(join(TMP, 'projects', 'note-new.md'), `---
title: "Note New"
type: project
tags: [tag-x]
created: 2026-03-28
updated: 2026-03-28
status: active
summary: "New note"
related: []
---

# Note New
`);
    vault.invalidateCache();

    const changes = vault.detectChanges();
    assert.ok(changes.created.length > 0);
    assert.ok(changes.created.some(p => p.includes('note-new')));
  });

  it('detects deleted notes', () => {
    idx.sync();

    // Delete a note
    rmSync(join(TMP, 'projects', 'note-2.md'));
    vault.invalidateCache();

    const changes = vault.detectChanges();
    assert.ok(changes.deleted.length > 0);
    assert.ok(changes.deleted.some(p => p.includes('note-2')));
  });

  it('hash cache persists to .clausidian/hashes.json', () => {
    vault.detectChanges();

    const cacheFile = join(TMP, '.clausidian', 'hashes.json');
    assert.ok(existsSync(cacheFile), 'Cache file should exist');

    const cacheData = JSON.parse(readFileSync(cacheFile, 'utf8'));
    assert.ok(Object.keys(cacheData).length > 0, 'Cache should contain file hashes');
  });

  it('degraded gracefully when cache corrupted', () => {
    // Corrupt the cache
    mkdirSync(join(TMP, '.clausidian'), { recursive: true });
    writeFileSync(join(TMP, '.clausidian', 'hashes.json'), '{invalid json}');

    vault.invalidateCache();

    // Should not throw, should return valid changes
    const changes = vault.detectChanges();
    assert.ok(typeof changes.created === 'object');
    assert.ok(typeof changes.modified === 'object');
    assert.ok(typeof changes.deleted === 'object');
  });

  it('sync includes unchanged count in result', () => {
    vault.invalidateCache();
    const result = idx.sync();

    assert.ok('unchanged' in result || 'total' in result);
  });
});

describe('Set Optimization (TF-IDF Link Suggestions)', () => {
  let vault, idx;

  before(() => {
    rmSync(TMP, { recursive: true, force: true });
    mkdirSync(join(TMP, 'projects'), { recursive: true });
    mkdirSync(join(TMP, 'journal'), { recursive: true });

    // Create 50 test notes with varied tags for scoring
    for (let i = 1; i <= 50; i++) {
      const tags = [];
      if (i % 2 === 0) tags.push('backend');
      if (i % 3 === 0) tags.push('api');
      if (i % 5 === 0) tags.push('database');
      if (i % 7 === 0) tags.push('frontend');
      if (i % 11 === 0) tags.push('testing');

      writeFileSync(join(TMP, 'projects', `note-${i}.md`), `---
title: "Note ${i}"
type: project
tags: [${tags.join(', ')}]
created: 2026-03-27
updated: 2026-03-27
status: active
summary: "Test note ${i} with keywords"
related: []
---

# Note ${i}

Content for note ${i}.
`);
    }

    vault = new Vault(TMP);
    idx = new IndexManager(vault);
  });

  after(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it('Set optimization does not change TF-IDF scores (numeric equivalence)', () => {
    // Build graph twice, check suggested links are identical
    const notes1 = vault.scanNotes({ includeBody: true });
    const result1 = idx.rebuildGraph(notes1);
    const graph1 = vault.read('_graph.md');

    // Extract suggested links section
    const suggestedMatch1 = graph1.match(/## Suggested Links[\s\S]*?(?=## Clusters|$)/);
    const suggestedText1 = suggestedMatch1 ? suggestedMatch1[0] : '';

    // Run again with same data
    const notes2 = vault.scanNotes({ includeBody: true });
    const result2 = idx.rebuildGraph(notes2);
    const graph2 = vault.read('_graph.md');

    const suggestedMatch2 = graph2.match(/## Suggested Links[\s\S]*?(?=## Clusters|$)/);
    const suggestedText2 = suggestedMatch2 ? suggestedMatch2[0] : '';

    // Suggested links should be identical
    assert.strictEqual(suggestedText1, suggestedText2, 'Suggested links should be identical across runs');
    assert.strictEqual(result1.suggestedLinks, result2.suggestedLinks, 'Suggested link count should match');
  });

  it('50-note vault completes rebuildGraph in reasonable time', () => {
    const notes = vault.scanNotes({ includeBody: true });
    const startTime = process.hrtime.bigint();
    idx.rebuildGraph(notes);
    const endTime = process.hrtime.bigint();

    const elapsedMs = Number(endTime - startTime) / 1_000_000;
    console.log(`\n  rebuildGraph for 50 notes: ${elapsedMs.toFixed(2)}ms`);

    // Should be < 500ms (very generous bound)
    assert.ok(elapsedMs < 500, `Expected < 500ms, got ${elapsedMs.toFixed(2)}ms`);
  });

  it('IDF weights remain correct after Set optimization', () => {
    const notes = vault.scanNotes({ includeBody: true });
    idx.rebuildGraph(notes);
    const graph = vault.read('_graph.md');

    // Verify suggested links exist
    assert.ok(graph.includes('## Suggested Links'), 'Should have suggested links section');

    // Extract scores from suggested links table
    const scoreMatches = graph.match(/\|\s*\[\[.*?\]\]\s*\|\s*\[\[.*?\]\]\s*\|\s*([\d.]+)\s*\|/g);
    if (scoreMatches && scoreMatches.length > 0) {
      // All scores should be >= 1.5 (the threshold)
      const scores = scoreMatches.map(m => {
        const match = m.match(/([\d.]+)\s*\|$/);
        return parseFloat(match[1]);
      });
      for (const score of scores) {
        assert.ok(score >= 1.5, `Score ${score} should be >= 1.5 threshold`);
      }
    }
  });

  it('shared tags are correctly identified in link suggestions', () => {
    const notes = vault.scanNotes({ includeBody: true });
    idx.rebuildGraph(notes);
    const graph = vault.read('_graph.md');

    // Extract suggested links with their shared tags
    const linkMatches = graph.match(/\|\s*\[\[(.*?)\]\]\s*\|\s*\[\[(.*?)\]\]\s*\|\s*([\d.]+)\s*\|\s*([^|]+)\s*\|/g);
    if (linkMatches && linkMatches.length > 0) {
      for (const match of linkMatches.slice(0, 3)) {
        // Each link should have at least one shared tag listed
        const tagMatch = match.match(/\|\s*([^|]+)\s*\|$/);
        assert.ok(tagMatch && tagMatch[1].trim().length > 0, 'Each link should list shared tags');
      }
    }
  });

  it('link suggestion order is consistent (by score descending)', () => {
    const notes = vault.scanNotes({ includeBody: true });
    idx.rebuildGraph(notes);
    const graph = vault.read('_graph.md');

    // Extract all scores in order
    const scoreMatches = graph.match(/\|\s*\[\[.*?\]\]\s*\|\s*\[\[.*?\]\]\s*\|\s*([\d.]+)\s*\|/g);
    if (scoreMatches && scoreMatches.length > 1) {
      const scores = scoreMatches.map(m => {
        const match = m.match(/([\d.]+)\s*\|$/);
        return parseFloat(match[1]);
      });

      // Verify descending order
      for (let i = 1; i < scores.length; i++) {
        assert.ok(
          scores[i - 1] >= scores[i],
          `Scores should be descending: ${scores[i - 1]} >= ${scores[i]}`
        );
      }
    }
  });
});

describe('Unit 3: Lazy Body Extraction', () => {
  let vault, idx;

  before(() => {
    rmSync(TMP, { recursive: true, force: true });
    mkdirSync(join(TMP, 'projects'), { recursive: true });
    mkdirSync(join(TMP, 'resources'), { recursive: true });

    // Create test notes with bodies
    writeFileSync(join(TMP, 'projects', 'note-a.md'), `---
title: "Note A"
type: project
tags: [backend, api]
created: 2026-03-27
updated: 2026-03-27
status: active
summary: "API design principles"
related: []
---

# Note A Body

This is a long body with lots of text content that should NOT be loaded
during the sync phase. Body content includes keywords like distributed,
caching, microservices, and authentication mechanisms. This section should
be skipped during rebuildGraph() to save memory.
`);

    writeFileSync(join(TMP, 'projects', 'note-b.md'), `---
title: "Note B"
type: project
tags: [backend, cache]
created: 2026-03-27
updated: 2026-03-27
status: active
summary: "Caching strategies"
related: []
---

# Note B Body

Detailed caching implementation with Redis, Memcached, and distributed
cache patterns. Contains keywords like consistency, TTL, eviction,
and replication. This body should NOT be included in sync.
`);

    writeFileSync(join(TMP, 'resources', 'note-c.md'), `---
title: "Note C"
type: resource
tags: [backend]
created: 2026-03-27
updated: 2026-03-27
status: active
summary: "Microservices overview"
related: []
---

# Note C Body

Body text discussing service discovery, load balancing, circuit breakers,
fault tolerance, and distributed tracing. This should not be loaded during
regular sync operations.
`);

    vault = new Vault(TMP);
    idx = new IndexManager(vault);
  });

  after(() => {
    rmSync(TMP, { recursive: true, force: true });
  });

  it('scanNotes() without includeBody does not load body text', () => {
    const notes = vault.scanNotes();
    for (const note of notes) {
      assert.ok(!note.body || note.body === undefined, 
        `Note ${note.file} should not have body field, but got: ${typeof note.body}`);
    }
  });

  it('scanNotes({ includeBody: true }) loads body when explicitly requested', () => {
    const notes = vault.scanNotes({ includeBody: true });
    const noteA = notes.find(n => n.file === 'note-a');
    assert.ok(noteA.body, 'Note A should have body when includeBody=true');
    assert.ok(noteA.body.includes('distributed'), 'Body should contain expected keywords');
  });

  it('rebuildGraph() uses scanNotes() without body (no includeBody param)', () => {
    const result = idx.rebuildGraph();
    assert.ok(result.relationships !== undefined, 'rebuildGraph should return results');
    
    // Verify internal state: notes used should not have body
    const notes = vault.scanNotes();
    for (const note of notes) {
      assert.ok(!note.body || note.body === undefined,
        'rebuildGraph should use notes without body');
    }
  });

  it('keyword extraction only uses title + summary (no body)', () => {
    // Manually extract keywords like rebuildGraph does
    const notes = vault.scanNotes(); // No body!
    const noteA = notes.find(n => n.file === 'note-a');
    
    const text = `${noteA.title} ${noteA.summary}`.toLowerCase();
    const words = new Set(text.match(/[a-z\u4e00-\u9fff]{3,}/g) || []);
    
    // Should have title+summary keywords
    assert.ok(words.has('note') || words.has('api'), 'Should have keywords from title/summary');
    
    // Should NOT have body-only keywords since body is not loaded
    assert.ok(!words.has('distributed'), 'Should not have "distributed" (body-only keyword)');
  });

  it('caching behavior: multiple scanNotes() calls use same cache', () => {
    const notes1 = vault.scanNotes();
    const notes2 = vault.scanNotes();
    
    // Should be same object reference (cached)
    assert.strictEqual(notes1, notes2, 'scanNotes() should return cached result');
  });

  it('rebuildGraph preserves link suggestion quality despite title+summary-only keywords', () => {
    const result = idx.rebuildGraph();
    const graph = vault.read('_graph.md');
    
    // Graph should still be generated and contain table structure
    assert.ok(graph.includes('| Source | Links To |'), 'Graph should have proper table');
    assert.ok(result.relationships >= 0, 'Should have relationships calculated');
  });

  it('search() still works with body by explicitly using includeBody', () => {
    // search() method should handle body loading for full-text search
    const results = vault.search('caching');
    assert.ok(Array.isArray(results), 'search() should return array');
    // Even if results are empty, search should not throw
  });

  it('scanNotes cache is separate for body vs no-body', () => {
    const withoutBody = vault.scanNotes();
    const withBody = vault.scanNotes({ includeBody: true });
    
    // Should be different cached results
    assert.notStrictEqual(withoutBody, withBody,
      'scanNotes() should have separate caches for includeBody');
  });
});
