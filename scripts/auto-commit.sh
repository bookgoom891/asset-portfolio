#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/home/user/asset-portfolio"
cd "$REPO_DIR"

# Only commit if there are changes
if ! git diff --quiet || ! git diff --cached --quiet || [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "Auto commit $(date '+%Y-%m-%d %H:%M:%S')" || true
  git push -u origin main
fi
