#!/bin/bash
# Weekly Obsidian automation: generate review + health report
set -e

VAULT='/Users/dex/YD 2026/obsidian'
export PATH="/Users/dex/.local/bin:/usr/local/bin:$PATH"

# 1. Generate weekly review (includes A1: promotion suggestions, A4: conclusion aggregation)
obsidian-agent review --vault "$VAULT" 2>/dev/null || true

# 2. Health check (includes A3: staleness detection)
obsidian-agent health --vault "$VAULT" 2>/dev/null

# 3. Validate frontmatter completeness
obsidian-agent validate --vault "$VAULT" 2>/dev/null || true

# 4. Find orphans and broken links
echo "--- Orphans ---"
obsidian-agent orphans --vault "$VAULT" 2>/dev/null || true
echo "--- Broken Links ---"
obsidian-agent broken-links --vault "$VAULT" 2>/dev/null || true

# 5. Sync and commit
obsidian-agent sync --vault "$VAULT" 2>/dev/null || true
cd "$VAULT"
if [ -n "$(git status --porcelain)" ]; then
    git add -A
    git commit -m "weekly: review + health $(date +%Y-%m-%d)" 2>/dev/null || true
fi
