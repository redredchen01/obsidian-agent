#!/bin/bash
# DSPy Trial — One-command setup + run
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

echo "📦 Setting up DSPy trial environment..."

# Create venv if needed
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
  echo "  Created virtualenv"
fi

source .venv/bin/activate

# Install dependencies
pip install -q "dspy[anthropic]"
echo "  Installed dspy[anthropic]"

# Extract dataset from vault
echo ""
echo "📊 Extracting dataset from Obsidian vault..."
python3 extract_dataset.py

# Check API key
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo ""
  echo "⚠️  Set ANTHROPIC_API_KEY before running the trial:"
  echo "    export ANTHROPIC_API_KEY='sk-ant-...'"
  echo ""
  echo "Then run:"
  echo "    source .venv/bin/activate && python3 run_trial.py"
  exit 0
fi

# Run trial
echo ""
echo "🚀 Running DSPy trial..."
python3 run_trial.py
