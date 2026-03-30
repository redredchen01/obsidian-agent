/**
 * sync — rebuild all indices (_tags.md, _graph.md) + cross-note link suggestions
 */
import { Vault } from '../vault.mjs';
import { IndexManager } from '../index-manager.mjs';

// A5: Find non-journal note pairs that share 2+ tags but have no `related` link
function findLinkSuggestions(vault) {
  const notes = vault.scanNotes();
  const nonJournal = notes.filter(n => n.type !== 'journal' && n.tags.length > 0);
  const suggestions = [];

  for (let i = 0; i < nonJournal.length; i++) {
    for (let j = i + 1; j < nonJournal.length; j++) {
      const a = nonJournal[i];
      const b = nonJournal[j];

      // Skip if already related
      if (a.related.includes(b.file) || b.related.includes(a.file)) continue;

      // Find shared tags
      const shared = a.tags.filter(t => b.tags.includes(t));
      if (shared.length >= 2) {
        suggestions.push({
          noteA: a.file,
          noteB: b.file,
          sharedTags: shared,
        });
      }
    }
  }

  return suggestions;
}

export function sync(vaultRoot) {
  const vault = new Vault(vaultRoot);
  const idx = new IndexManager(vault);
  const result = idx.sync();

  // A5: Append link suggestions to _graph.md
  const suggestions = findLinkSuggestions(vault);
  if (suggestions.length) {
    let graphContent = vault.read('_graph.md') || '';
    let section = '\n## 建議關聯（自動發現）\n\n| Note A | Note B | Shared Tags |\n|--------|--------|-------------|\n';
    for (const s of suggestions) {
      section += `| [[${s.noteA}]] | [[${s.noteB}]] | ${s.sharedTags.join(', ')} |\n`;
    }
    graphContent += section;
    vault.write('_graph.md', graphContent);
    console.log(`Index synced: ${result.tags} tags, ${result.notes} notes, ${result.relationships} relationships, ${suggestions.length} link suggestions`);
  } else {
    console.log(`Index synced: ${result.tags} tags, ${result.notes} notes, ${result.relationships} relationships`);
  }

  return { ...result, linkSuggestions: suggestions.length };
}
