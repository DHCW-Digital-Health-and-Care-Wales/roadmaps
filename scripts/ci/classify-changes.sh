#!/usr/bin/env bash
# Reads a pull request's changed paths on stdin, one per line, and prints which apps'
# CI jobs run for them as GitHub Actions outputs (`editor=true`). ci.yml's changes job
# runs it. It fails closed: a path it cannot place in documentation or another app's
# directory runs the editor's jobs, the root's configuration, the lockfile and the
# workflows included (STY-087 S5).
set -euo pipefail

editor=false
while IFS= read -r path; do
  case "$path" in
    "" | docs/* | *.md) ;;
    apps/editor/*) editor=true ;;
    apps/*/*) ;;
    *) editor=true ;;
  esac
done

echo "editor=$editor"
