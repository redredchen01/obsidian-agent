/**
 * journal — create or open today's journal entry
 */
import { Vault } from '../vault.mjs';
import { TemplateEngine } from '../templates.mjs';
import { IndexManager } from '../index-manager.mjs';
import { todayStr, weekdayShort, prevDate, nextDate, isValidDate } from '../dates.mjs';

export function journal(vaultRoot, { date } = {}) {
  if (date && !isValidDate(date)) {
    throw new Error(`Invalid date format: "${date}". Expected YYYY-MM-DD.`);
  }
  const vault = new Vault(vaultRoot);
  const tpl = new TemplateEngine(vaultRoot);
  const idx = new IndexManager(vault);
  const d = date || todayStr();

  const existing = vault.read('journal', `${d}.md`);
  if (existing) {
    console.log(`Journal ${d} already exists.`);
    console.log(existing);
    return { status: 'exists', date: d };
  }

  const content = tpl.render('journal', {
    DATE: d,
    WEEKDAY: weekdayShort(d),
    PREV_DATE: prevDate(d),
    NEXT_DATE: nextDate(d),
  });

  vault.write('journal', `${d}.md`, content);
  idx.updateDirIndex('journal', d, 'Daily journal');
  idx.sync();

  console.log(`Created journal/${d}.md`);
  return { status: 'created', date: d };
}
