# CHO-033: The Markdown link check checks each link's anchor

- **Status**: Proposed — a gap STY-086's review found, declined there as beyond its scope
- **Type**: Chore
- **Area**: CI/CD + Docs
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — a bounded test change with a slug rule to get right
- **Delivered**: _(add on delivery)_

## Summary

`build/markdown-links.test.ts` drops a link's `#anchor` before it checks the target, so
it proves the file exists but not the heading: a section that moves to another file
leaves its links pointing at a file without it, and nothing fails. When STY-086 moved
most of the README into `apps/editor/README.md`, one runbook link to
`README.md#security-and-data-access` broke unnoticed until review. Done: the check fails
on a relative link whose anchor names no heading of its target, slugged as GitHub does.

## Measurement

On STY-086's branch (based on `8348fa0`), a scratch script that slugs each target's
headings and checks every relative link with an anchor in the live tree (outside
`docs/backlog/_archive/` and `docs/analysis/delivery-runs/`, 166 Markdown files) found
one broken anchor, the runbook link above, which STY-086 fixed; none remain. It would
have caught that link in CI instead of in review. It recurs whenever a section moves
between files, which an archive move, a README split or a guide split each does, though
rarely: one broken anchor in this repository's history so far. Archived records were not
measured.

## Acceptance criteria

### S1: A link to a heading that does not exist fails the check

**Given** a Markdown file in the live tree with a relative link `other.md#no-such-heading`
**When** `pnpm test:docs` runs
**Then** it fails, naming the file and the link
**And** a link whose anchor matches a heading of its target, slugged as GitHub does
(lower case, punctuation dropped, spaces as hyphens), passes

### S2: An anchor into the same file is checked too

**Given** a link `#some-heading` with no file
**When** `pnpm test:docs` runs
**Then** it passes only when the linking file has that heading

## Decisions

## Out of scope

- Anchors in archived records and delivery runs, which are never rewritten: whether
  they are checked is this chore's first decision for the owner.
