Trace the chronological timeline of a topic across all notes and journals.

Usage: `<topic>` where topic is a note name, tag, or keyword

Run: `obsidian-agent thread "$ARGUMENTS"`

If the CLI is not available:
1. Search all notes and journals for mentions of the topic (title, tags, content, related)
2. Collect matching entries with their `created` and `updated` dates
3. Sort chronologically (oldest first)
4. Display as a timeline: date, note title, relevant excerpt
5. Highlight evolution — how the topic changed over time
6. Show linked notes at each point for context

$ARGUMENTS
