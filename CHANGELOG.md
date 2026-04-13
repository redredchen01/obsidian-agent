# Changelog

All notable changes to this project will be documented in this file.

## [3.6.0] - 2026-04-02

### Added — Dynamic Vault-Memory Management System
- **MemoryGraph** (`src/memory-graph.mjs`, 320 LOC)
  - Graph-based memory relationship tracking with weighted edges
  - Context-aware retrieval via graph traversal + relevance scoring
  - Automatic decay (0.95/day) and promotion (access count threshold)
  - Vault sync: auto-creates nodes + edges from notes, related links, shared tags
  - Persistent storage in `.clausidian/memory-graph.json`
  - Edge pruning (max 20/node, min weight 0.1)

- **SessionMemory** (`src/session-memory.mjs`, 280 LOC)
  - Session lifecycle: start → record events → end/abandon
  - Tracks decisions, learnings, next steps per session
  - Context window builder (combines current + recent sessions + graph)
  - Pending step tracking across sessions
  - Aggregated learnings with frequency counting
  - Auto-extraction of decisions from note creation patterns
  - Session storage in `.clausidian/sessions/*.json`

- **MemoryBridge** (`src/memory-bridge.mjs`, 250 LOC)
  - Unified coordinator for MemoryGraph + SessionMemory + Claude memory
  - Full bidirectional sync: vault ↔ graph, vault ↔ Claude memory
  - Auto-pull from Claude memory (detects external changes, auto-merges)
  - Event-driven: auto-sync on note:created/updated/deleted
  - Unified context query (graph + sessions + vault search combined)
  - Lifecycle maintenance: decay + promote + stale detection + cleanup

- **Enhanced CLI Commands** (expanded `memory` subcommands)
  - `memory full-sync` — full bidirectional sync with graph + lifecycle
  - `memory graph <action>` — stats|sync|neighbors|query|connections|hubs|decay
  - `memory session <action>` — start|end|stats|recent|pending|learnings|context|cleanup
  - `memory lifecycle <action>` — promote|stale|maintenance|diagnostics
  - `memory context <topic>` — unified context (graph + sessions + vault)
  - All commands available as MCP tools (memory_graph, memory_session, memory_lifecycle, memory_context)

- **New Event Types** (10 new events)
  - `memory:node_added`, `memory:edge_added`, `memory:decay_applied`, `memory:promoted`
  - `session:start`, `session:stop`, `session:abandoned`
  - `memory:full_sync`, `memory:pushed`, `memory:pulled`

- **Tests** (`test/memory-system.test.mjs`, 26 tests)
  - MemoryGraph: 11 tests (nodes, edges, traversal, context, decay, promotion, stats)
  - SessionMemory: 10 tests (lifecycle, events, persistence, cleanup, stats)
  - MemoryBridge: 5 tests (sync, context, diagnostics, maintenance)

### Changed
- Refactored `commands/memory.mjs` to integrate MemoryBridge (backward compatible)
- Updated `registry/integration.mjs` with new subcommands
- Updated `events/event-types.mjs` with memory/session event patterns

### Infrastructure
- 406 tests passing (26 new), 1 pre-existing failure (unrelated)
- Zero new dependencies (uses only Node.js stdlib)
- All new modules follow existing ESM + zero-dep patterns

## [3.5.0] - 2026-03-31

### Added
- **Deep Claude Code Integration (Phase 1-4)**: Repositioned as Claude Code's Obsidian integration layer
  - **Phase 1**: Rebranding — CLI description, README, keywords prioritize Claude Code
  - **Phase 2**: Hooks + MCP Enhancement
    - `sessionStart()` hook — reads today's journal + active projects
    - `preToolUse()` hook — logs Write/Edit operations to journal
    - Enhanced `sessionStop()` — persists decisions, learnings, nextSteps
    - 3 new MCP Resources: `vault://context`, `vault://active-projects`, `vault://health`
    - 3 new MCP Prompts: session-start, project-review, knowledge-extraction
  - **Phase 3**: Vault as Claude Memory (198 LOC)
    - `memorySync()` — sync vault notes (memory:true) to ~/.claude/memory/
    - `memoryPush()` — push individual notes to Claude memory
    - `memoryStatus()` — compare vault notes vs Claude memory
    - `contextForTopic()` — search + neighbors + backlinks for topic awareness
  - **Phase 4**: CLAUDE.md Auto-management (106 LOC)
    - `generateBlock()` — idempotent vault context block generation
    - `inject()` — add vault context to global CLAUDE.md
    - `remove()` — clean up clausidian blocks

### Changed
- Radical repository restructuring: Elevated from projects/tools/clausidian/ to repository root
- Repositioned primary project identity from "workspace tool" to "Claude Code integration layer"
- Updated package.json description to emphasize Claude Code + MCP integration
- Reorganized documentation: archived legacy status docs to docs/archive/

### Infrastructure
- Complete file tracking: 489 files (bin/, src/, test/, scaffold/, skill/, docs/, references/)
- Repository cleanup: removed 300+ temporary/workspace files
- All 426 unit tests passing (18 new tests for Phase 1-4)
- GitHub workflows: CI configuration for production-ready releases
- No breaking changes. All git history preserved via git mv operations.

## [1.0.1.0] - 2026-03-31

### Added
- Clausidian v3.4.0 event bus architecture — 29 system events, universal subscription system
- Parallel query executor for Vault with pattern-based caching (B2.2)
- Event-driven automation engine with YAML-based triggers and actions
- Multi-vault workflow support with bidirectional link synchronization

### Changed
- Vault class architecture refactored to support event-driven integration
- Pattern detector algorithms optimized for larger vaults
- Connection pooling and query performance improvements

### Fixed
- JavaScript class structure corrections in Pattern Detector
- Sync and workspace state consistency improvements

### Removed
- HR_BOT_PHASE2 experimental directory (archived to projects/production/)

