#!/bin/bash
# agent-trace.sh — Append a trace entry to ~/.claude/trace.jsonl
# Usage: agent-trace.sh <agent> <task> <status> <duration_ms> [summary]
# Status: success | failure | timeout | fallback

set -euo pipefail

TRACE_FILE="${HOME}/.claude/trace.jsonl"

if [ $# -lt 4 ]; then
  echo "Usage: agent-trace.sh <agent> <task> <status> <duration_ms> [summary]"
  echo "  agent:       codex|cline|gemini|kilo|opencode|qoder|claude-sub"
  echo "  task:        review|fix|generate|research|deploy"
  echo "  status:      success|failure|timeout|fallback"
  echo "  duration_ms: execution time in milliseconds"
  echo "  summary:     (optional) one-line result summary"
  exit 1
fi

AGENT="$1"
TASK="$2"
STATUS="$3"
DURATION_MS="$4"
SUMMARY="${5:-}"

TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# Ensure trace file exists
mkdir -p "$(dirname "$TRACE_FILE")"
touch "$TRACE_FILE"

# Build JSON with jq for proper escaping
ENTRY=$(jq -cn \
  --arg ts "$TS" \
  --arg agent "$AGENT" \
  --arg task "$TASK" \
  --arg status "$STATUS" \
  --argjson duration "$DURATION_MS" \
  --arg summary "$SUMMARY" \
  '{ts: $ts, agent: $agent, task: $task, status: $status, duration_ms: $duration, summary: $summary}')

echo "$ENTRY" >> "$TRACE_FILE"
echo "Traced: $AGENT/$TASK ($STATUS) ${DURATION_MS}ms"
