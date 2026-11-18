# CHO-022: Delivery-run records link to the archived records they name

- **Status**: Proposed — two delivery-run records still link to backlog records at
  the paths they had before they were archived
- **Type**: Docs
- **Area**: Docs
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Haiku — fourteen path edits, two exemptions removed and the
  list's comment trimmed to the templates

## Summary

`build/markdown-links.test.ts` fails on any relative Markdown link to a file that does
not exist, so a record's move to `_archive/` can no longer break the links into it
unnoticed. Two delivery-run records were already broken when the check arrived. It
exempts them by path for now, so they and the links they hold go unchecked. Done looks
like: each of their fourteen links points at the record's archived path, their two
entries leave `EXEMPT_PATHS`, its comment names only the templates, and the test
passes.

## Measurement

With the two exemptions removed, the test reports these broken links in the records
as they stand at commit `0f7b22c`. Each target now sits under `docs/backlog/_archive/`, in the same `chores/` or
`defects/` folder.

| Record (`docs/analysis/delivery-runs/`)           | Broken links | Targets                                                               |
| ------------------------------------------------- | ------------ | --------------------------------------------------------------------- |
| `2026-11-14-epc-011-adding-roadmaps-and-items.md` | 10           | CHO-007, CHO-008, CHO-010, CHO-012, CHO-013, CHO-015; DEF-007–DEF-010 |
| `2026-11-15-backlog-triage-mop-up.md`             | 4            | DEF-011–DEF-014                                                       |

## Acceptance criteria

### S1: The delivery-run records are checked

- **Given** `EXEMPT_PATHS` in `build/markdown-links.test.ts` names only the templates
  whose links are placeholders
- **When** the unit tests run
- **Then** the markdown-links test passes

## Decisions

## Delivery
