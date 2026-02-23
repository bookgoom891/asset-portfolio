#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/home/user/asset-portfolio"
LOG_FILE="/tmp/auto-push-watch.log"
PID_FILE="$REPO_DIR/.git/auto-push.pid"
LOCK_DIR="$REPO_DIR/.git/auto-push.lock"

# Prevent duplicate watchers
if [ -f "$PID_FILE" ]; then
  if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "Watcher already running (PID $(cat "$PID_FILE"))" >> "$LOG_FILE"
    exit 0
  fi
fi

echo $$ > "$PID_FILE"
trap 'rm -f "$PID_FILE"' EXIT

cd "$REPO_DIR"

echo "Watcher started at $(date '+%F %T')" >> "$LOG_FILE"

while true; do
  status=$(git status --porcelain || true)
  if [ -z "$status" ]; then
    sleep 2
    continue
  fi

  if ! mkdir "$LOCK_DIR" 2>/dev/null; then
    sleep 2
    continue
  fi

  trap 'rmdir "$LOCK_DIR" 2>/dev/null; rm -f "$PID_FILE"' EXIT

  status=$(git status --porcelain || true)
  if [ -n "$status" ]; then
    git add -A
    git commit -m "Auto commit $(date '+%Y-%m-%d %H:%M:%S')" || true
    if git push -u origin main; then
      echo "Pushed at $(date '+%F %T')" >> "$LOG_FILE"
    else
      echo "Push failed at $(date '+%F %T')" >> "$LOG_FILE"
    fi
  fi

  rmdir "$LOCK_DIR" 2>/dev/null || true
  trap 'rm -f "$PID_FILE"' EXIT
  sleep 2
done
