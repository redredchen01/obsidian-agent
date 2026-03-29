Assemble full context around a note for deep work.

Usage: `<note>` where note is a filename (without .md)

Run: `obsidian-agent context "$ARGUMENTS"`

If the CLI is not available:
1. Find and read the target note
2. Resolve all `related` links — read each related note's frontmatter and summary
3. Search for backlinks (other notes that reference this one via `[[note]]`)
4. Find relevant journal entries that mention this note
5. Collect tags and find other notes sharing the same tags
6. Display assembled context: the note itself, related notes summaries, backlinks, journal mentions, and tag siblings
7. Highlight any open questions or action items found in the context

$ARGUMENTS
