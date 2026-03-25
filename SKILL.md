---
name: session-wrap
version: 2.0.0
description: |
  Session wrap-up: automatically persist project context to memory files for seamless resume across sessions.
  Use when: user says "收工", "wrap up", "結束", "整理記憶", "resume準備", "保存上下文",
  "下次繼續", "先到這", "今天先這樣", "done for now", "save context", "end session",
  or any session-ending intent in any language.
  Also use proactively when a significant milestone is reached and user seems done.
  Works with any AI coding agent that supports file-based memory (Claude Code, Cursor, Windsurf, etc.).
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Grep
---

# Session Wrap — Universal Memory Persistence

Automatically capture project state at session end so the next session resumes with full context. Works with any AI coding agent that supports persistent file storage.

**Core problem solved**: AI agents lose all context between sessions. Users waste time re-explaining "where we left off". This skill eliminates that by writing structured memory files that get auto-loaded next session.

## Trigger Keywords

Multi-language support:

| Language | Keywords |
|----------|----------|
| 中文 | 收工、結束、整理記憶、先到這、今天先這樣、下次繼續、保存上下文、開新對話 |
| English | wrap up, done for now, save context, end session, call it a day, let's stop here |
| 日本語 | 終了、今日はここまで、保存して |

Also trigger proactively when: major milestone reached, user says "thanks" with finality, or context window is getting full.

## Process

### Step 1: Gather State

Run these in parallel:

1. **Git state** (if in a git repo):
   - `git log --oneline -15` — recent commits
   - `git status --short` — uncommitted changes
   - `git branch --show-current` — current branch
   - `git remote -v` — remote URLs
2. **Existing memory files**: scan the memory directory for files to update vs create
3. **Project artifacts**: check for README, config files (package.json, pyproject.toml, go.mod, Cargo.toml, etc.), specs, plans
4. **Non-git projects**: if no git, scan directory structure and key files instead

### Step 2: Determine Memory Location

The memory directory depends on the agent platform:

| Platform | Memory Path |
|----------|-------------|
| Claude Code | `~/.claude/projects/<project-hash>/memory/` (auto-detected) |
| Cursor | `.cursor/memory/` in project root |
| Windsurf | `.windsurf/memory/` in project root |
| Generic | `.ai-memory/` in project root |

**Detection logic**: Check for platform-specific directories in order. If none exist, check if running inside Claude Code (has `CLAUDE_PROJECT_DIR` or similar env), otherwise default to `.ai-memory/` in project root.

For Claude Code specifically: the memory path is `~/.claude/projects/<project-hash>/memory/` where `<project-hash>` is derived from the working directory. The agent already knows this path — just use the auto-memory system directly.

### Step 3: Analyze & Categorize

From the session context + gathered state, decide what to persist:

| Memory Type | What to capture | Examples |
|-------------|----------------|----------|
| **project** | Current status, version, what's done, what's pending, repo URL, branch state | "v2.1 released, auth refactor in progress on feat/auth branch" |
| **feedback** | Lessons learned, gotchas, patterns discovered this session | "Don't mock the DB in integration tests — caused false passes last time" |
| **user** | New preferences or workflow patterns observed | "Prefers TDD, wants terse responses, uses vim keybindings" |
| **reference** | External resources, URLs, tools discovered | "API docs at internal.company.com/api, bugs tracked in Linear project CORE" |

### Step 4: Write Memory Files

Each file uses frontmatter for metadata (machine-parseable by any agent):

```markdown
---
name: {{descriptive name}}
description: {{one-line summary — specific enough to judge relevance in future sessions}}
type: {{project|feedback|user|reference}}
updated: {{YYYY-MM-DD}}
---

{{content}}
```

**File naming**: `{type}_{topic}.md` (e.g., `project_myapp.md`, `feedback_testing.md`)

**Rules**:
- **Update over create** — if an existing memory file covers the same topic, update it
- **Distill, don't dump** — extract the signal, discard the noise
- **Absolute dates** — convert "today", "yesterday" to actual dates (e.g., 2026-03-25)
- **No ephemeral state** — no debug sessions, no temp paths, no in-progress exploration
- **No code-derivable info** — file structure, architecture, API signatures belong in code, not memory
- **No git-trackable info** — commit history, diffs, blame — use `git log` for that

### Step 5: Update Index

Write/update `MEMORY.md` as the index file. It contains ONLY links to memory files with brief descriptions:

```markdown
# Memory Index

## Project
- [MyApp Status](project_myapp.md) — v2.1 released, auth refactor in progress

## Feedback
- [Testing Patterns](feedback_testing.md) — real DB for integration tests, mock only for unit

## User
- [Preferences](user_preferences.md) — TDD, terse responses, vim user

## Reference
- [External Resources](reference_apis.md) — API docs, Linear project, Grafana dashboard
```

Keep under 200 lines. Organized by type, not chronologically.

### Step 6: Confirm

Report to user with a summary table:

```
記憶已更新：

| 檔案 | 動作 | 內容 |
|------|------|------|
| project_myapp.md | 更新 | v2.1 完成，auth 重構進行中 |
| feedback_testing.md | 新增 | 整合測試用 real DB |
| user_preferences.md | 不變 | — |

下次開新對話會自動載入這些上下文。
```

## Anti-patterns

- **Don't dump the entire session** — distill to what matters for FUTURE sessions
- **Don't persist what git tracks** — commit history, file contents, diffs
- **Don't persist task lists** — those are session-scoped
- **Don't persist code snippets** — they go stale. Point to file + line instead
- **Don't create memory for trivial sessions** — if nothing meaningful happened, say so and skip
- **Don't over-categorize** — 3-5 memory files is typical. 10+ means you're persisting too much

## Edge Cases

- **No git repo**: Skip git state gathering. Use directory listing and file modification times instead.
- **First session ever**: Create all memory files from scratch. Explain the memory system briefly to the user.
- **Nothing to save**: Tell the user "本次 session 沒有需要持久化的新資訊" and skip.
- **Conflicting memories**: If new info contradicts existing memory, update the memory and note the change.
- **Multiple projects**: Each project gets its own memory directory. Don't cross-contaminate.
