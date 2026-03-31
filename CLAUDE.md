# Clausidian Development

Claude Code's Obsidian integration toolkit — AI agent toolkit for vault management with zero dependencies.

## Core Settings
- **Language**: English (for open-source contributions)
- **Style**: Direct, technical, minimal ceremony
- **Node.js**: >= 18 (ESM modules)

## Quick Start

```bash
# Install
npm install -g clausidian

# Or run locally
npm test           # Run full test suite
npm run dev        # Development mode (if available)

# Init a new vault
clausidian init ~/my-vault
clausidian setup ~/my-vault
```

## Development Workflow

### Testing
```bash
npm test                    # All tests
npm test -- test/foo.mjs    # Single test file
```

### Code Organization
- **src/commands/** — CLI command implementations
- **src/registry.mjs** — Command registry (CLI + MCP source of truth)
- **src/mcp-server.mjs** — MCP server (Model Context Protocol)
- **test/** — Test suite (node:test framework)
- **scaffold/** — Vault init templates and AGENT.md

### Key Files
| File | Purpose |
|------|---------|
| `src/registry.mjs` | Single source of truth for all 55+ commands (CLI + MCP) |
| `src/mcp-server.mjs` | MCP server implementation (stdio transport) |
| `src/commands/*.mjs` | Individual command implementations |
| `test/*.test.mjs` | Comprehensive test suite |

## Architecture

- **Zero dependencies** — only Node.js standard library
- **MCP Protocol** — exposes 44+ tools via Model Context Protocol
- **CLI-first** — all functionality available from command line
- **Hook system** — integrates with agent workflows (session-start, pre-tool-use, session-stop, etc.)

## Contributing

Before submitting PRs:
1. Run full test suite: `npm test`
2. Ensure all tests pass (target: 100%)
3. Follow existing code patterns (no external dependencies)
4. Update tests for new functionality
5. Document new commands in README.md

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed design notes.
