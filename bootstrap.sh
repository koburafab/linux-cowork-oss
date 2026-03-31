#!/bin/bash
# bootstrap.sh — Script de reprise pour sessions autonomes
# Usage: source ~/Documents/linux-cowork-oss/bootstrap.sh

set -e

PROJECT_DIR="$HOME/Documents/linux-cowork-oss"
cd "$PROJECT_DIR"

echo "=== Linux Cowork OSS — Bootstrap ==="
echo ""

# 1. Etat du projet
echo "--- PROGRESS ---"
grep -E '^\- \[' PROGRESS.md | head -30
echo ""

# 2. Prochaine tache
echo "--- NEXT TASK ---"
NEXT=$(grep -m1 '^\- \[ \]' PROGRESS.md)
echo "$NEXT"
echo ""

# 3. Git status
if [ -d .git ]; then
    echo "--- GIT ---"
    git log --oneline -5 2>/dev/null || echo "No commits yet"
    echo ""
fi

# 4. Build check
if [ -f package.json ]; then
    echo "--- BUILD ---"
    bun run build 2>&1 | tail -3 || echo "Build not configured yet"
    echo ""
fi

# 5. Tests
if [ -f package.json ]; then
    echo "--- TESTS ---"
    bun test 2>&1 | tail -5 || echo "Tests not configured yet"
    echo ""
fi

echo "=== Ready to work ==="
