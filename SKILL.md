---
name: session-wrap
version: 1.0.0
description: |
  Session wrap-up: persist project context to memory files for seamless resume.
  Use when: user says "收工", "wrap up", "結束", "整理記憶", "resume準備",
  "保存上下文", "下次繼續", "先到這", "今天先這樣", or any session-ending intent.
  Also use proactively when a significant milestone is reached and user seems done.
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
---

# Session Wrap — Memory Persistence Automation

When a session ends, capture the current project state into the auto-memory system so the next conversation can resume with full context. This eliminates the need to manually explain "where we left off".

## Trigger

User signals session end or context switch. Keywords: 收工, wrap up, 結束, 整理記憶, resume, 保存, 下次繼續, 先到這, 今天先這樣, new session, 開新對話.

## Process

### Step 1: Gather State

Collect these in parallel:

1. **Git state**: `git log --oneline -15`, `git status --short`, `git remote -v`, current branch
2. **Existing memory files**: scan `memory/` dir under the project's `.claude/projects/` path
3. **Key artifacts**: check for README, CLAUDE.md, package.json/pyproject.toml, recent specs/plans

### Step 2: Analyze & Categorize

From the current session context + gathered state, identify what needs persisting:

| Memory Type | What to capture |
|-------------|----------------|
| **project** | Current status, version, what's done, what's pending, repo URL, branch state |
| **feedback** | Any lessons learned, gotchas, or patterns discovered this session |
| **user** | Any new preferences or workflow patterns observed |
| **reference** | Any external resources, URLs, or tools discovered |

Rules:
- **Update over create**: if an existing memory file covers the same topic, update it rather than creating a duplicate
- **Don't persist ephemeral state**: no debug sessions, no temp file paths, no in-progress exploration
- **Absolute dates**: convert "today", "yesterday", "this week" to actual dates (e.g., 2026-03-25)
- **Code-derivable info goes in code, not memory**: file structure, architecture, API signatures — these belong in the codebase. Memory is for context that ISN'T in the code.

### Step 3: Write Memory Files

Each memory file uses this format:

```markdown
---
name: {{descriptive name}}
description: {{one-line summary — specific enough to judge relevance in future sessions}}
type: {{project|feedback|user|reference}}
---

{{content}}
```

File naming: `{type}_{topic}.md` (e.g., `project_static_ghost.md`, `feedback_iopaint_cli.md`)

### Step 4: Update MEMORY.md Index

`MEMORY.md` is the index file — it contains ONLY links to memory files with brief descriptions. Organized by type, not chronologically. Keep it under 200 lines (truncated beyond that).

```markdown
# Memory Index

## Project
- [Topic](filename.md) — one-line description

## User
- [Topic](filename.md) — one-line description

## Feedback
- [Topic](filename.md) — one-line description

## Reference
- [Topic](filename.md) — one-line description
```

### Step 5: Confirm

Tell the user:
- What memory files were created/updated
- Summary of persisted state (table format, keep it short)
- Confirm they can start a new session — memory will auto-load

## Anti-patterns

- **Don't dump the entire session into memory** — distill, don't copy
- **Don't persist what git already tracks** — commit history, file contents, diffs
- **Don't persist task lists** — those are session-scoped, use TodoWrite instead
- **Don't persist code snippets** — they go stale. Point to the file + line instead
- **Don't create memory for trivial sessions** — if nothing meaningful happened, say so and skip

## Example Output

```
記憶已更新：

| 檔案 | 動作 | 內容 |
|------|------|------|
| project_myapp.md | 更新 | v2.1 完成，API 重構已 merge |
| feedback_testing.md | 新增 | E2E 測試要用 real DB 不要 mock |
| user_preferences.md | 不變 | — |

下次開新對話我會自動載入這些上下文。可以開新 session 了。
```
