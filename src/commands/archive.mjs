/**
 * archive — set a note's status to archived
 */
import { Vault } from '../vault.mjs';
import { IndexManager } from '../index-manager.mjs';
import { todayStr } from '../dates.mjs';

export function archive(vaultRoot, noteName) {
  const vault = new Vault(vaultRoot);
  const idx = new IndexManager(vault);

  if (!noteName) {
    throw new Error('Usage: obsidian-agent archive <note-name>');
  }

  const notes = vault.scanNotes();
  const note = notes.find(n => n.file === noteName);
  if (!note) {
    throw new Error(`Note not found: ${noteName}`);
  }

  if (note.status === 'archived') {
    console.log(`Already archived: ${note.dir}/${note.file}.md`);
    return { status: 'already_archived' };
  }

  vault.updateNote(note.dir, note.file, {
    status: 'archived',
    updated: todayStr(),
  });
  idx.rebuildTags();

  console.log(`Archived ${note.dir}/${note.file}.md`);
  return { status: 'archived', file: `${note.dir}/${note.file}.md` };
}
