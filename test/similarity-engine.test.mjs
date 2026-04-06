/**
 * Test similarity-engine — unified scoring logic
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Vault } from '../src/vault.mjs';
import { SimilarityEngine } from '../src/similarity-engine.mjs';
import { buildDocIDF, buildDocVector, cosineSimilarity, tokenizeDoc } from '../src/scoring.mjs';

// Mock notes for testing
const mockNotes = [
  {
    file: 'note-a',
    type: 'resource',
    title: 'JavaScript Fundamentals',
    summary: 'Core concepts of JS',
    body: 'JavaScript is a programming language. Variables, functions, closures.',
    tags: ['javascript', 'programming'],
    related: [],
  },
  {
    file: 'note-b',
    type: 'resource',
    title: 'Python Basics',
    summary: 'Intro to Python',
    body: 'Python is a language. Variables, functions, loops.',
    tags: ['python', 'programming'],
    related: [],
  },
  {
    file: 'note-c',
    type: 'resource',
    title: 'Web Development',
    summary: 'Building web apps',
    body: 'JavaScript and HTML for web. Functions and closures in JS.',
    tags: ['javascript', 'web'],
    related: [],
  },
  {
    file: 'note-d',
    type: 'resource',
    title: 'No Tags Note',
    summary: 'Orphan',
    body: 'This note has no tags.',
    tags: [],
    related: [],
  },
  {
    file: 'note-e',
    type: 'journal',
    title: '2026-03-30',
    summary: 'Daily entry',
    body: '',
    tags: ['daily'],
    related: [],
  },
];

describe('SimilarityEngine', () => {
  it('should score pairs with shared tags', () => {
    const vault = { scanNotes: () => mockNotes };
    const engine = new SimilarityEngine(vault, { minScore: 0.2 });

    const pairs = engine.scorePairs(mockNotes);

    // Should find note-a (javascript, programming) and note-c (javascript, web) similar
    const noteAC = pairs.find(p => (p.a === 'note-a' && p.b === 'note-c') || (p.a === 'note-c' && p.b === 'note-a'));
    assert.ok(noteAC, 'Should find note-a and note-c as similar');
    assert.ok(noteAC.score >= 0.2, 'Score should be above threshold');
    assert.ok(noteAC.shared.includes('javascript'), 'Should have javascript as shared tag');
  });

  it('should ignore journal notes', () => {
    const vault = { scanNotes: () => mockNotes };
    const engine = new SimilarityEngine(vault, { minScore: 0.2 });

    const pairs = engine.scorePairs(mockNotes);

    // Should not score any pairs involving note-e (journal)
    const hasJournal = pairs.some(p => p.a === 'note-e' || p.b === 'note-e');
    assert.ok(!hasJournal, 'Should not include journal notes');
  });

  it('should not score notes without tags', () => {
    const vault = { scanNotes: () => mockNotes };
    const engine = new SimilarityEngine(vault, { minScore: 0.2 });

    const pairs = engine.scorePairs(mockNotes);

    // Should not include note-d (no tags)
    const hasNoteD = pairs.some(p => p.a === 'note-d' || p.b === 'note-d');
    assert.ok(!hasNoteD, 'Should not include notes without tags');
  });

  it('should score based on TF-IDF weights', () => {
    const vault = { scanNotes: () => mockNotes };
    const engine = new SimilarityEngine(vault, { minScore: 0.2 });

    const pairs = engine.scorePairs(mockNotes);

    // All pairs should have score >= minScore (0.2)
    for (const p of pairs) {
      assert.ok(p.score >= 0.2, `All pairs should have score >= 0.2, got ${p.score}`);
    }
  });

  it('should respect maxResults limit', () => {
    const vault = { scanNotes: () => mockNotes };
    const engine = new SimilarityEngine(vault, { minScore: 0.2, maxResults: 2 });

    const pairs = engine.scorePairs(mockNotes);

    assert.ok(pairs.length <= 2, `Should limit results to 2, got ${pairs.length}`);
  });

  it('should cache TF-IDF weights', () => {
    const vault = { scanNotes: () => mockNotes };
    const engine = new SimilarityEngine(vault, { minScore: 0.2 });

    // First call
    const pairs1 = engine.scorePairs(mockNotes);
    const cached = engine.tfidfCache;
    assert.ok(cached, 'Should cache TF-IDF weights');

    // Second call with same notes
    const pairs2 = engine.scorePairs(mockNotes);
    assert.strictEqual(engine.tfidfCache, cached, 'Should return cached weights');
    assert.deepStrictEqual(pairs1, pairs2, 'Results should be identical');
  });

  it('should invalidate cache when notes change', () => {
    const vault = { scanNotes: () => mockNotes };
    const engine = new SimilarityEngine(vault, { minScore: 0.2 });

    // First call
    engine.scorePairs(mockNotes);
    const cached1 = engine.tfidfCache;

    // Call with different notes
    const newNotes = mockNotes.map(n => ({ ...n, tags: n.tags }));
    newNotes[0].tags = ['different', 'tags'];
    engine.scorePairs(newNotes);

    assert.notStrictEqual(engine.tfidfCache, cached1, 'Cache should be invalidated on note changes');
  });

  it('findRelated should score by title and tags', () => {
    const vault = { scanNotes: () => mockNotes };
    vault.scanNotes = () => mockNotes;

    const engine = new SimilarityEngine(vault);
    const related = engine.findRelated('JavaScript', ['programming'], 5);

    assert.ok(related.length > 0, 'Should find related notes');
    assert.ok(related[0].score > 0, 'Top result should have positive score');
    // Note-a should score high (title contains 'JavaScript', has 'programming' tag)
    const noteA = related.find(n => n.file === 'note-a');
    assert.ok(noteA, 'Should find note-a');
  });

  it('findRelated should cap results', () => {
    const vault = { scanNotes: () => mockNotes };
    vault.scanNotes = () => mockNotes;

    const engine = new SimilarityEngine(vault);
    const related = engine.findRelated('test', [], 2);

    assert.ok(related.length <= 2, `Should limit to 2 results, got ${related.length}`);
  });

  it('should support incremental scoring', () => {
    const vault = { scanNotes: () => mockNotes };
    const engine = new SimilarityEngine(vault);

    // Full scan
    const allPairs = engine.scorePairs(mockNotes);

    // Incremental: only rescore pairs involving note-a
    const dirtySet = new Set(['note-a']);
    const incrPairs = engine.scorePairs(mockNotes, { incremental: true, dirtySet });

    // Incremental should have fewer pairs (only those involving note-a)
    assert.ok(incrPairs.length <= allPairs.length, 'Incremental should have same or fewer pairs');
    assert.ok(incrPairs.every(p => p.a === 'note-a' || p.b === 'note-a'), 'All pairs should involve note-a');
  });

  it('should cache document vectors', () => {
    const vault = { scanNotes: () => mockNotes };
    const engine = new SimilarityEngine(vault, { minScore: 0.2 });

    engine.scorePairs(mockNotes);
    const cached = engine.docVectorCache;
    assert.ok(cached instanceof Map, 'Should cache doc vectors as Map');

    engine.scorePairs(mockNotes);
    assert.strictEqual(engine.docVectorCache, cached, 'Should return same cached Map');
  });

  it('cosine similarity boosts notes with shared content beyond tag overlap', () => {
    // note-x and note-y share no tags but have very similar bodies
    const contentNotes = [
      {
        file: 'note-x',
        type: 'resource',
        title: 'Machine Learning Guide',
        summary: 'ML concepts',
        body: 'Neural networks backpropagation gradient descent optimizer loss function training data',
        tags: ['ml'],
        related: [],
      },
      {
        file: 'note-y',
        type: 'resource',
        title: 'Deep Learning Intro',
        summary: 'DL basics',
        body: 'Neural networks backpropagation gradient descent optimizer loss function layers',
        tags: ['ml'],
        related: [],
      },
      {
        file: 'note-z',
        type: 'resource',
        title: 'Cooking Recipes',
        summary: 'Food',
        body: 'Pasta tomato sauce cheese olive oil garlic basil oregano',
        tags: ['ml'],
        related: [],
      },
    ];

    const vault = { scanNotes: () => contentNotes };
    const engine = new SimilarityEngine(vault, { minScore: 0 });
    const pairs = engine.scorePairs(contentNotes);

    const xyPair = pairs.find(p => (p.a === 'note-x' && p.b === 'note-y') || (p.a === 'note-y' && p.b === 'note-x'));
    const xzPair = pairs.find(p => (p.a === 'note-x' && p.b === 'note-z') || (p.a === 'note-z' && p.b === 'note-x'));

    assert.ok(xyPair, 'Should find note-x and note-y as a pair');
    assert.ok(xzPair, 'Should find note-x and note-z as a pair');
    assert.ok(xyPair.score > xzPair.score, `ML notes (${xyPair.score}) should score higher than cooking notes (${xzPair.score})`);
  });
});

describe('scoring — TF-IDF document vectors', () => {
  it('tokenizeDoc should exclude stopwords', () => {
    const note = { title: 'The quick brown fox', summary: '', body: 'it is a test' };
    const tokens = tokenizeDoc(note);
    assert.ok(!tokens.includes('the'), 'Should exclude "the"');
    assert.ok(!tokens.includes('is'), 'Should exclude "is"');
    assert.ok(!tokens.includes('it'), 'Should exclude "it"');
    assert.ok(tokens.includes('quick'), 'Should include "quick"');
    assert.ok(tokens.includes('brown'), 'Should include "brown"');
    assert.ok(tokens.includes('test'), 'Should include "test"');
  });

  it('buildDocIDF should assign lower IDF to common terms', () => {
    const notes = [
      { title: 'neural networks', summary: '', body: 'deep learning neural' },
      { title: 'neural guide', summary: '', body: 'neural networks training' },
      { title: 'cooking', summary: '', body: 'pasta sauce garlic' },
    ];
    const idf = buildDocIDF(notes);
    assert.ok(idf['neural'] < idf['garlic'], '"neural" (frequent) should have lower IDF than "garlic" (rare)');
  });

  it('buildDocVector should return sparse vector with positive weights', () => {
    const notes = [
      { title: 'JavaScript', summary: 'programming', body: 'functions closures' },
      { title: 'Python', summary: 'scripting', body: 'functions loops' },
    ];
    const idf = buildDocIDF(notes);
    const vec = buildDocVector(notes[0], idf);
    assert.ok(typeof vec === 'object', 'Should return object');
    const values = Object.values(vec);
    assert.ok(values.length > 0, 'Vector should have entries');
    assert.ok(values.every(v => v > 0), 'All vector values should be positive');
  });

  it('cosineSimilarity should return 1 for identical vectors', () => {
    const vec = { a: 0.5, b: 0.3, c: 0.8 };
    const sim = cosineSimilarity(vec, vec);
    assert.ok(Math.abs(sim - 1.0) < 0.001, `Identical vectors should have similarity ~1, got ${sim}`);
  });

  it('cosineSimilarity should return 0 for orthogonal vectors', () => {
    const vec1 = { a: 1, b: 0 };
    const vec2 = { c: 1, d: 0 };
    const sim = cosineSimilarity(vec1, vec2);
    assert.strictEqual(sim, 0, 'Orthogonal vectors should have similarity 0');
  });

  it('cosineSimilarity should return 0 for empty vectors', () => {
    assert.strictEqual(cosineSimilarity({}, {}), 0, 'Empty vectors should return 0');
    assert.strictEqual(cosineSimilarity({ a: 1 }, {}), 0, 'One empty vector should return 0');
  });

  it('cosineSimilarity should return value in [0, 1] for normal vectors', () => {
    const notes = [
      { title: 'neural networks deep learning', summary: '', body: 'backpropagation gradient descent optimizer' },
      { title: 'neural nets overview', summary: '', body: 'backpropagation training loss function' },
      { title: 'cooking pasta', summary: '', body: 'tomato sauce garlic olive oil' },
    ];
    const idf = buildDocIDF(notes);
    const v0 = buildDocVector(notes[0], idf);
    const v1 = buildDocVector(notes[1], idf);
    const v2 = buildDocVector(notes[2], idf);

    const simClose = cosineSimilarity(v0, v1);
    const simFar = cosineSimilarity(v0, v2);

    assert.ok(simClose >= 0 && simClose <= 1, `Similarity should be in [0,1], got ${simClose}`);
    assert.ok(simFar >= 0 && simFar <= 1, `Similarity should be in [0,1], got ${simFar}`);
    assert.ok(simClose > simFar, `Similar content (${simClose}) should score higher than dissimilar (${simFar})`);
  });
});
