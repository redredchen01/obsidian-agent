import test from 'node:test';
import assert from 'node:assert/strict';
import { SearchCache } from '../src/search-cache.mjs';

test('SearchCache stats', async (t) => {
  await t.test('cache stats reflects cache state', async () => {
    const cache = new SearchCache();
    cache.set('q1', {}, ['a']);
    cache.set('q2', {}, ['b']);
    cache.get('q1', {}); // hit

    const stats = cache.stats();
    assert.ok(stats.totalEntries > 0, 'Cache totalEntries should be > 0');
    assert.equal(stats.hits, 1, 'Should have 1 hit');
    assert.equal(stats.misses, 0, 'Should have 0 misses');
  });
});
