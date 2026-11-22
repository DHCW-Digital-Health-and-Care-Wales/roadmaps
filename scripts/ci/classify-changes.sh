#!/usr/bin/env bash
# Prints which apps' CI jobs run as GitHub Actions outputs (`editor=true`), one line per
# app; ci.yml's changes job runs it. With --all, every app's jobs run (a push to main, a
# manual run). Otherwise it reads a pull request's changed paths on stdin, one per line,
# and fails closed: a path it cannot place in documentation or one app's directory runs
# every app's jobs, the root's configuration, the lockfile and the workflows included
# (STY-087 S5, STY-088 S4).
set -euo pipefail

if [ "${1:-}" = "--all" ]; then
  echo "editor=true"
  echo "site=true"
  exit 0
fi

editor=false
site=false
while IFS= read -r path || [ -n "$path" ]; do
  case "$path" in
    "" | docs/* | *.md) ;;
    apps/editor/*) editor=true ;;
    apps/public-site/*) site=true ;;
    apps/*/*) ;;
    *)
      editor=true
      site=true
      ;;
  esac
done

echo "editor=$editor"
echo "site=$site"
