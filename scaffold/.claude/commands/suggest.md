Show today's prioritized action list based on vault state.

Run: `obsidian-agent suggest`

If the CLI is not available:
1. Read today's journal entry (if exists) for planned tasks
2. Find active projects (`status: active` + `type: project`) and their goals
3. Find stale notes (not updated in 7+ days but still active)
4. Find unlinked ideas (`type: idea` with empty `related` field)
5. Check recent journal entries for unresolved action items
6. Prioritize and display: high-priority tasks first, then maintenance items
7. Group by category: active work, follow-ups, housekeeping

$ARGUMENTS
