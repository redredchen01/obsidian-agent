/**
 * sync — rebuild all indices (_tags.md, _graph.md) with TF-IDF weighted suggestions
 */
import { Vault } from '../vault.mjs';
import { IndexManager } from '../index-manager.mjs';

export function sync(vaultRoot) {
  const vault = new Vault(vaultRoot);
  const idx = new IndexManager(vault);
  const result = idx.sync();

  console.log(
    `Index synced: ${result.tags} tags, ${result.notes} notes, ` +
      `${result.relationships} relationships, ${result.suggestedLinks} suggestions`
  );

  return result;
}
