# CHO-007: An open About form takes a date its own "Mark as updated today" wrote as its own

- **Status**: Won't do — owner, 2026-11-15 (D1); archived
- **Type**: Chore
- **Area**: Features/UI
- **Epic**: standalone
- **Depends on**: STY-036 (hard)
- **Binding ADRs**: ADR-012
- **Suggested model**: Sonnet — a bounded change to how an open form re-bases a field
  after the Product Lead's own publish
- **Delivered**: _(add on delivery)_

## Summary

An About form re-bases a field on the Product Lead's own publish only when the latest
read holds what the form showed (`originOf` in
`src/features/roadmaps/editing/pending-changes.ts`). "Mark as updated today" (STY-036)
writes a date the form never showed. So if Sam opens the About form, changes the date
without pressing Done, publishes other pending edits from the bar with the tick box
ticked, then confirms the form and publishes again, the second publish is refused: the
review shows the date Sam's own tick box wrote as "Current text", as if a co-lead had
written it. Nothing is lost, and "Keep mine" resolves it. Done: a date written by the
tick box while a form is open re-bases that form's date, as an own publish of a field
the form showed does.

## Measurement

At commit `75a5b32` (STY-036's branch): reproduced by STY-036's final fresh correctness
pass (Sol), a focused planner reproduction returning `refused`. The path needs a date
edited and not confirmed, other pending edits, and the tick box ticked in between: no
user report yet.

## Acceptance criteria

### S1: The tick box's own date is no conflict for an open form

**Given** Sam's About form is open with the date changed, not yet confirmed, and other
edits pending
**When** Sam publishes them with "Mark as updated today" ticked, then confirms the form
and publishes
**Then** the date Sam chose is published, with no conflict review

## Decisions

- **D1** (agent, 2026-11-15, STY-043): About is now edited in the roadmap dialog, which
  is modal, so the publish bar can't be used while the form is open with the date
  changed. The path in the Summary is left only where the dialog is opened while that
  publish is still being written. The owner may prefer to close this chore: until
  then it stays Proposed.

- **D1** (owner, 2026-11-15, the owner's triage of the live chores and defects): Won't do. Since STY-043 the About form is in a modal dialog, so the path is left only while a publish is still being written as the dialog opens (D1 above), and "Keep mine" resolves it. Reopen on a report of the refusal from a Product Lead.

## Out of scope

- A co-lead's date written while the form is open: still a conflict (STY-036 S9).
