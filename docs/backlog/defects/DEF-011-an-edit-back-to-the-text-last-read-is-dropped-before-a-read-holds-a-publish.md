# DEF-011: An edit back to the text last read is dropped while a published edit waits for a read

- **Status**: Needs triage — found by DEF-009's review (Sol, round 2)
- **Severity**: Low — the page shows the old text with nothing pending, while the data
  source holds the published text, until the next read shows it
- **Area**: Features (pending-edit rules)
- **Epic**: EPC-011-adding-roadmaps-and-items
- **Depends on**: DEF-009 (merged)
- **Binding ADRs**: ADR-012
- **Suggested model**: Opus — what an edit is based on while the page can't read
- **Delivered**: _(add on delivery)_

## Summary

A Product Lead publishes a title changed from A to B; the write lands and the read
after it fails, so DEF-009 keeps B pending, based on B. They then change the title back
to A and choose Done. The edit is dropped: the page shows A, from the last read, with
nothing pending, while the data source holds B. The next read shows B. The same holds
for the roadmap's own text. Worked out from the code and a unit reproduction by the
reviewer, not seen in a browser.

## Reproduce

On `fix/def-009-published-item-stays-pending` (not yet on the default branch), as a
`pending-changes.test.ts` case: `keepUnread(sent, sent)` for a title sent as "Sent",
then `editItem` (or `editRoadmap`) back to the item's text as read.

**Expected**: the field stays pending, `{ base: "Sent", value: <text as read> }`.
**Actual**: the field is dropped.

## Cause

Verified by a unit test that was red. `editFields` (`editing/pending-changes.ts`) drops
a value equal to the current text, the item or roadmap as last read, which a kept edit
no longer matches. Dropping only a value equal to the base fixes this case but breaks
the rule that an edit to a co-lead's newer text is no edit
(`pending-changes.test.ts`, "keeps the first base over later edits, and drops an edit
back to it"): `FieldChange` can't tell a kept edit from an ordinary one.

- `rg -n 'value === text' src/features/roadmaps/editing/pending-changes.ts` — one site.

## Acceptance criteria

### S1: An edit back to the text last read stays pending while a publish waits for a read

**Given** a published edit kept pending because the read after it failed
**When** the Product Lead edits the field back to the text the page last read
**Then** the field stays pending with that value, and publishing writes it

## Decisions

## Delivery _(add on delivery; as in `story.md`)_
