#!/bin/bash
set -euo pipefail

# Only prepare remote (web) sessions; a local checkout is set up by its owner.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

echo "==> Installing dependencies..."
pnpm install --frozen-lockfile

# `pnpm dev` needs .env.local: vite dev does not read .env.production.
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "==> Created .env.local from .env.example."
fi

cat <<'HINT'
==> On demand (nothing started yet):
      pnpm dev                                      http://localhost:5173
      pnpm exec playwright install --with-deps chromium   before the first pnpm test:e2e
HINT
