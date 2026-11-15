# Wayfinding on GitHub Issues

Run `gh` inside the checkout so it targets `collisdigital/roadmaps-editor`;
confirm with `gh repo view --json nameWithOwner` before the session's first
write. Write multi-line bodies to a temporary file and pass `--body-file`.

## Labels

Create the five labels before charting the first map; `--force` makes this
safe to repeat:

```sh
for l in map research prototype grilling task; do
  gh label create "wayfinder:$l" --color 5319e7 --force \
    --description "Wayfinder $l (.agents/skills/wayfinder)"
done
```

## Operations

- **Map**: `gh issue create --label wayfinder:map --title "<effort>" --body-file <file>`.
- **Child ticket**: `gh issue create --parent <map> --label wayfinder:<type> --title "<question>" --body-file <file>`.
  Sub-issue order is map order; reorder in the map's UI if a ticket must move.
- **Blocking**, the second pass once every ticket has its number:
  `gh issue edit <ticket> --add-blocked-by <n>,<n>`. Remove an edge with
  `--remove-blocked-by`.
- **Frontier**: the map's open children that have no assignee and no open
  blocker, in map order:

  ```sh
  for n in $(gh issue view <map> --json subIssues \
    --jq '.subIssues.nodes[] | select(.state == "OPEN") | .number'); do
    gh issue view "$n" --json number,title,assignees,blockedBy \
      --jq 'select((.assignees | length) == 0 and ([.blockedBy.nodes[] | select(.state == "OPEN")] | length) == 0) | "\(.number) \(.title)"'
  done
  ```

- **Claim**: `gh issue edit <n> --add-assignee @me`, the session's first write.
- **Resolve**: `gh issue comment <n> --body-file <file>`, then
  `gh issue close <n>`, then add the line to the map's Decisions so far:
  read the body (`gh issue view <map> --json body --jq .body`) just before
  writing it back (`gh issue edit <map> --body-file <file>`), since another
  session may have edited it. Comment before closing: on an already-closed
  issue `gh issue close --comment` drops the comment yet exits 0.
- **Out of scope**: comment the reason, close it with
  `gh issue close <n> --reason "not planned"`, and add its line to the map.
- **Read a ticket**: `gh issue view <n> --json number,title,body,labels,assignees,comments`.

A bare `#<n>` in a body links to whichever issue or PR holds that number, so
write cross-references only once the real numbers exist.
