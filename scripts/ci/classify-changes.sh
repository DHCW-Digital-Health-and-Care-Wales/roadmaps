#!/usr/bin/env bash
# Prints which apps' CI jobs run as GitHub Actions outputs (`editor=true`), one line per
# app; ci.yml's changes job runs it. With --all, every app's jobs run (a push to main, a
# manual run). Otherwise it reads a pull request's changed paths on stdin, one per line,
# and fails closed: a path it cannot place in documentation, one app's directory or the
# API's generated package runs every app's jobs, the root's configuration, the lockfile
# and the workflows included (STY-087 S5, STY-088 S4, STY-090 S10, STY-092 S8).
set -euo pipefail

if [ "${1:-}" = "--all" ]; then
  echo "editor=true"
  echo "site=true"
  echo "api=true"
  exit 0
fi

editor=false
site=false
api=false
while IFS= read -r path || [ -n "$path" ]; do
  case "$path" in
    "" | docs/* | *.md) ;;
    apps/editor/*) editor=true ;;
    apps/public-site/*) site=true ;;
    apps/api/*) api=true ;;
    # The API's generated types and schemas, which the editor imports and the public
    # site does not yet (STY-092 D8). Any other package runs every app's jobs.
    packages/api-types/*)
      editor=true
      api=true
      ;;
    apps/*/*) ;;
    *)
      editor=true
      site=true
      api=true
      ;;
  esac
done

echo "editor=$editor"
echo "site=$site"
echo "api=$api"
