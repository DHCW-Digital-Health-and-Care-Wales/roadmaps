#!/bin/bash
set -euo pipefail

cd "$CLAUDE_PROJECT_DIR"

# Warn when this checkout lacks commits of the remote default branch. A planning session
# once ran on a worktree cut from a deleted, squash-merged branch and wrote its records in
# an outdated layout, unnoticed until its PR. Review by 2027-02-10: remove it if sessions
# no longer start on stale branches.
warn_if_behind_default_branch() {
  local remote=origin default behind base track
  default=$(git symbolic-ref --quiet --short "refs/remotes/$remote/HEAD" 2>/dev/null) || return 0
  # A shallow boundary hides HEAD's ancestors, so the count below would be wrong.
  [ "$(git rev-parse --is-shallow-repository 2>/dev/null)" = false ] || return 0

  # Best effort and never interactive. The worst case is about 15 s on a dead network;
  # without `timeout` (macOS), only the HTTPS low-speed limit bounds it.
  local -a bound=()
  command -v timeout >/dev/null && bound=(timeout 15)
  GIT_TERMINAL_PROMPT=0 GIT_SSH_COMMAND="ssh -o BatchMode=yes -o ConnectTimeout=10" \
    ${bound[@]+"${bound[@]}"} git -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=10 \
    fetch --quiet "$remote" "${default#"$remote"/}" </dev/null 2>/dev/null || true

  behind=$(git rev-list --count "HEAD..$default" 2>/dev/null) || return 0
  [ "$behind" -gt 0 ] || return 0
  base=$(git merge-base HEAD "$default" 2>/dev/null) || base=""
  track=$(git for-each-ref --format='%(upstream:track)' "$(git symbolic-ref -q HEAD || echo none)" 2>/dev/null) || track=""

  if [ -z "$base" ] || [ -z "$(git rev-list --parents -n 1 "$base" | cut -s -d' ' -f2)" ] ||
    [ "$track" = "[gone]" ]; then
    # Unrelated history, or a branch whose remote was deleted: starting again is the fix.
    echo "==> Warning: HEAD is not based on current $default (its history meets it only at the root, or its remote branch is gone). Start new work on a branch from $default."
  elif git rev-parse --verify --quiet '@{upstream}' >/dev/null; then
    echo "==> Note: this pushed branch is $behind commit(s) behind $default. Merge $default into it before publishing; never rebase a pushed branch."
  else
    echo "==> Note: HEAD is $behind commit(s) behind $default. Rebase onto $default before publishing."
  fi
}
warn_if_behind_default_branch

# Only prepare remote (web) sessions; a local checkout is set up by its owner.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

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
