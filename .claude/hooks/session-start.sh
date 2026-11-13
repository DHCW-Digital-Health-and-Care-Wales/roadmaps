#!/bin/bash
set -euo pipefail

# Work in the session's current checkout: CLAUDE_PROJECT_DIR stays at the launch
# directory after the session enters a worktree, while the hook input's `cwd` follows it.
hook_cwd=""
if [ ! -t 0 ]; then
  hook_cwd=$(node -e 'let s = ""
process.stdin.on("data", (d) => (s += d)).on("end", () => {
  try { process.stdout.write(JSON.parse(s).cwd ?? "") } catch {}
})' 2>/dev/null) || hook_cwd=""
fi
cd "$(git -C "${hook_cwd:-$CLAUDE_PROJECT_DIR}" rev-parse --show-toplevel 2>/dev/null ||
  echo "$CLAUDE_PROJECT_DIR")"

# Note when this checkout lacks commits of the remote default branch. A planning session
# once ran on a worktree cut from a deleted, squash-merged branch and wrote its records in
# an outdated layout, unnoticed until its PR. Review by 2027-02-10: remove it if sessions
# no longer start on stale branches.
note_if_behind_default_branch() {
  local remote=origin default behind timeout_cmd
  default=$(git symbolic-ref --quiet --short "refs/remotes/$remote/HEAD" 2>/dev/null) || return 0
  # A shallow boundary hides HEAD's ancestors, so the count below would be wrong.
  [ "$(git rev-parse --is-shallow-repository 2>/dev/null)" = false ] || return 0

  # Best effort and never interactive: fetch only under `timeout` (at most 15 s, which
  # also bounds credential helpers); Homebrew's coreutils names it `gtimeout`. Without
  # either (stock macOS), compare against the refs last fetched. The user's own SSH
  # command is kept, with batch mode added.
  timeout_cmd=$(command -v timeout || command -v gtimeout) || timeout_cmd=""
  if [ -n "$timeout_cmd" ]; then
    local ssh_cmd
    ssh_cmd=${GIT_SSH_COMMAND:-$(git config core.sshCommand 2>/dev/null || echo ssh)}
    GIT_TERMINAL_PROMPT=0 GIT_SSH_COMMAND="$ssh_cmd -o BatchMode=yes -o ConnectTimeout=10" \
      "$timeout_cmd" 15 git fetch --quiet "$remote" </dev/null 2>/dev/null || true
  fi

  behind=$(git rev-list --count "HEAD..$default" 2>/dev/null) || return 0
  [ "$behind" -gt 0 ] || return 0
  echo "==> Note: HEAD is $behind commit(s) behind $default. If this branch's PR has already merged, start new work on a branch from $default. Otherwise rebase onto its base before publishing, even if its PR is open (implement-story's references/pull-requests.md, \"Update a branch\")."
}
note_if_behind_default_branch

# Only prepare remote (web) sessions; a local checkout is set up by its owner.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Claude reads stdout only when the hook exits 0, so report a failed install there
# rather than exit on it; the log keeps pnpm's progress lines out of context.
install_log=$(mktemp "${TMPDIR:-/tmp}/pnpm-install.XXXXXX")
if pnpm install --frozen-lockfile >"$install_log" 2>&1; then
  rm -f "$install_log"
  echo "==> Installed dependencies."
else
  echo "==> Warning: pnpm install --frozen-lockfile failed (log: $install_log). Fix it before running any check."
fi

# `pnpm dev` needs .env.local: vite dev does not read .env.production.
if [ ! -f .env.local ]; then
  cp .env.example .env.local
  echo "==> Created .env.local from .env.example."
fi
