# session-wrap

A Claude Code skill that automatically persists project context to memory files when you end a session, so your next conversation resumes with full context.

No more "let me explain where we left off" — just start a new session and keep going.

## What it does

When you signal session end ("收工", "wrap up", "先到這", etc.), it:

1. **Scans** git state, existing memory files, key project artifacts
2. **Distills** what matters: project status, lessons learned, preferences, references
3. **Writes** structured memory files with frontmatter metadata
4. **Updates** the MEMORY.md index
5. **Confirms** with a summary table

## Install

Copy into your Claude Code skills directory:

```bash
# Clone
git clone https://github.com/redredchen01/session-wrap-skill.git

# Copy to skills
cp -r session-wrap-skill ~/.claude/skills/session-wrap
```

Or manually: copy `SKILL.md` to `~/.claude/skills/session-wrap/SKILL.md`.

## Usage

Just end your session naturally:

```
你: 收工
你: wrap up
你: 先到這，下次繼續
你: 今天先這樣
```

Claude will automatically scan your project state and persist context.

### Output example

```
記憶已更新：

| 檔案 | 動作 | 內容 |
|------|------|------|
| project_myapp.md | 更新 | v2.1 完成，API 重構已 merge |
| feedback_testing.md | 新增 | E2E 測試要用 real DB 不要 mock |
| user_preferences.md | 不變 | — |

下次開新對話我會自動載入這些上下文。可以開新 session 了。
```

## Memory types

| Type | What gets saved |
|------|----------------|
| **project** | Status, version, what's done/pending, repo URL, branch state |
| **feedback** | Lessons learned, gotchas, patterns discovered |
| **user** | Workflow preferences, communication style |
| **reference** | External resources, URLs, tools |

## How it works

Claude Code has a built-in [auto-memory system](https://docs.anthropic.com/en/docs/claude-code/memory) that persists files across sessions. This skill structures and automates what would otherwise be manual context-saving.

Memory files are stored in your project's `.claude/projects/<project-hash>/memory/` directory with YAML frontmatter for metadata. The `MEMORY.md` index is automatically loaded into every new conversation.

### What it WON'T save

- Code snippets (they go stale — points to files instead)
- Git history (use `git log`)
- Task lists (session-scoped)
- Temp file paths or debug state
- Anything derivable from the codebase itself

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code/overview) CLI
- A git repository (for state scanning)

## License

MIT
