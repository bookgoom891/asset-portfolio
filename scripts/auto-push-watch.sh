#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/home/user/asset-portfolio"
cd "$REPO_DIR"

LOCK_FILE="$REPO_DIR/.git/auto-push.lock"

while true; do
  if [ -z "$(git status --porcelain)" ]; then
    sleep 2
    continue
  fi

  if ! mkdir "$LOCK_FILE" 2>/dev/null; then
    sleep 2
    continue
  fi

  trap 'rmdir "$LOCK_FILE"' EXIT

  if [ -n "$(git status --porcelain)" ]; then
    git add -A
    git commit -m "Auto commit $(date '+%Y-%m-%d %H:%M:%S')" || true
    git push -u origin main
  fi

  rmdir "$LOCK_FILE"
  trap - EXIT
  sleep 2
done
