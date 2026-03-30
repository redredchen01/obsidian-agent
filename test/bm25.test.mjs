import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BM25Index, tokenize, analyze } from '../src/bm25.mjs';

describe('tokenizer', () => {
  it('splits and lowercases text', () => {
    const tokens = tokenize('Hello World Test');
    assert.ok(tokens.includes('hello'));
    assert.ok(tokens.includes('world'));
    assert.ok(tokens.includes('test'));
  });

  it('removes stop words', () => {
    const tokens = tokenize('the quick brown fox is a very good animal');
    assert.ok(!tokens.includes('the'));
    assert.ok(!tokens.includes('is'));
    assert.ok(!tokens.includes('a'));
    assert.ok(tokens.includes('quick'));
    assert.ok(tokens.includes('brown'));
    assert.ok(tokens.includes('fox'));
  });

  it('handles CJK text', () => {
    const tokens = tokenize('API 设计 模式 指南');
    assert.ok(tokens.includes('api'));
    assert.ok(tokens.includes('设计'));
  });

  it('handles empty input', () => {
    assert.deepEqual(tokenize(''), []);
    assert.deepEqual(tokenize(null), []);
    assert.deepEqual(tokenize(undefined), []);
  });
});

describe('analyze (tokenize + stem)', () => {
  it('stems English words', () => {
    const tokens = analyze('designing patterns quickly');
    assert.ok(tokens.includes('design'));
    assert.ok(tokens.includes('pattern'));
    assert.ok(tokens.includes('quick'));
  });
});

describe('BM25Index', () => {
  const mockNotes = [
    { file: 'api-design.md', title: 'API Design Patterns', type: 'resource', status: 'active', tags: ['api', 'design'], summary: 'Best practices for REST API design', body: 'RESTful APIs should follow resource-oriented design. Use proper HTTP methods.' },
    { file: 'node-guide.md', title: 'Node.js Guide', type: 'resource', status: 'active', tags: ['node', 'javascript'], summary: 'Getting started with Node.js', body: 'Node.js is a runtime for JavaScript. Install with nvm.' },
    { file: 'project-alpha.md', title: 'Project Alpha', type: 'project', status: 'active', tags: ['api', 'backend'], summary: 'Build the API service', body: 'This project implements the REST API for our backend service.' },
    { file: 'random-idea.md', title: 'Random Idea', type: 'idea', status: 'draft', tags: [], summary: '', body: 'What if we built a search engine?' },
    { file: 'meeting-notes.md', title: 'Meeting Notes', type: 'journal', status: 'active', tags: ['daily'], summary: 'Team standup', body: 'Discussed API design review. Need to finalize the REST endpoints.' },
  ];

  it('builds index from notes', () => {
    const idx = new BM25Index();
    idx.build(mockNotes);
    assert.strictEqual(idx.docCount, 5);
    assert.ok(idx.avgDL > 0);
    assert.ok(idx.invertedIndex.size > 0);
  });

  it('ranks API-related notes higher for "API design"', () => {
    const idx = new BM25Index();
    idx.build(mockNotes);
    const results = idx.search('API design');
    assert.ok(results.length > 0);
    // api-design.md should be #1 (title + tags + summary + body all match)
    assert.strictEqual(results[0].file, 'api-design.md');
  });

  it('handles multi-word queries', () => {
    const idx = new BM25Index();
    idx.build(mockNotes);
    const results = idx.search('REST API endpoints');
    assert.ok(results.length >= 2);
    // Both api-design and project-alpha mention REST API
  });

  it('filters by type', () => {
    const idx = new BM25Index();
    idx.build(mockNotes);
    const results = idx.search('API', { type: 'project' });
    assert.ok(results.every(r => r.type === 'project'));
  });

  it('filters by tag', () => {
    const idx = new BM25Index();
    idx.build(mockNotes);
    const results = idx.search('API', { tag: 'backend' });
    assert.ok(results.every(r => r.tags.includes('backend')));
  });

  it('returns empty for no matches', () => {
    const idx = new BM25Index();
    idx.build(mockNotes);
    const results = idx.search('xyznonexistent');
    assert.strictEqual(results.length, 0);
  });

  it('respects limit parameter', () => {
    const idx = new BM25Index();
    idx.build(mockNotes);
    const results = idx.search('API', { limit: 2 });
    assert.ok(results.length <= 2);
  });

  it('scores include numeric values', () => {
    const idx = new BM25Index();
    idx.build(mockNotes);
    const results = idx.search('API design');
    for (const r of results) {
      assert.ok(typeof r.score === 'number');
      assert.ok(r.score > 0);
    }
  });
});
