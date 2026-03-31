#!/bin/bash
# night-build.sh — Script de build autonome pour sessions Claude Code
# Lance via cron ou manuellement pour continuer le dev

set -e

export PATH="$HOME/.bun/bin:$HOME/.cargo/bin:$PATH"
PROJECT_DIR="$HOME/Documents/linux-cowork-oss"
LOG_FILE="$PROJECT_DIR/scripts/build-log.txt"

cd "$PROJECT_DIR"

echo "=== Night Build $(date) ===" >> "$LOG_FILE"

# 1. Check current state
echo "--- Progress ---" >> "$LOG_FILE"
grep -c '^\- \[x\]' PROGRESS.md >> "$LOG_FILE" 2>&1 || true
echo " tasks done" >> "$LOG_FILE"

# 2. Run tests
echo "--- Tests ---" >> "$LOG_FILE"
cd "$PROJECT_DIR/app"
bun test 2>&1 | tail -5 >> "$LOG_FILE"

# 3. Try build
echo "--- Build ---" >> "$LOG_FILE"
bun run build 2>&1 | tail -10 >> "$LOG_FILE" || echo "Build failed" >> "$LOG_FILE"

# 4. Git status
echo "--- Git ---" >> "$LOG_FILE"
cd "$PROJECT_DIR"
git log --oneline -3 >> "$LOG_FILE" 2>&1

echo "=== Done $(date) ===" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
