# Defect template

- **File**: `docs/backlog/defects/DEF-{nnn}-{kebab-title}.md`; terminal statuses
  (Done, Won't fix, Superseded) move to `docs/backlog/_archive/defects/`.
- The common rules of `story.md` apply (owner reads the top block only; write
  what the code cannot say; never rewrite the claim; IDs; statuses in
  `status-lifecycle.md`).
- **Reproduce before recording.** Run the steps at a default-branch commit
  (a branch commit is lost to a squash merge) and list every site the run and
  its search found, not the first one.
- A defect found during delivery starts as `Needs triage` and is listed under
  Defects in `docs/backlog/README.md` (and in its epic's `## Defects`, if it
  belongs to one). Only the owner moves it out of triage.

---

# DEF-{nnn}: <what goes wrong, for whom>

- **Status**: Needs triage — found by <STY-{nnn} delivery | retro | PR #nnn
  review>
- **Severity**: High | Medium | Low — <the consequence, in a clause>
- **Area**: Domain | Infrastructure | Features/UI | Routing | i18n (en + cy) |
  E2E | CI/CD | Docs (`+` to combine)
- **Epic**: <epic folder, e.g. EPC-002-roadmap-detail> | standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Opus | Sonnet | Haiku — <the reason>
- **Delivered**: _(add on delivery)_

## Summary

_Three to six lines for the owner: who sees what wrong, since when if known,
how often, and the workaround if any. No file names._

## Reproduce

At commit `<sha>` on the default branch:

1. <step>
2. <step>

**Expected**: <observable outcome>
**Actual**: <observable outcome>

## Cause

_Verified or suspected (say which), naming the symbol. The search behind
"every site", so a reviewer reruns it rather than recounting:_

- `rg -n '<pattern>' src` — <n> sites: `path:line`, …

## Acceptance criteria

_S1 is the regression that fails at the commit above. While Needs grilling,
the open questions replace the scenarios (see `story.md`, Open questions)._

### S1: <the regression that would have caught it>

**Given** …
**When** …
**Then** …

## Open questions _(while Needs grilling)_

## Decisions

_The triage outcome is D1: fix (with priority or owning record), Won't fix,
or Superseded by a record that holds the fix. A fix the decisions suggest is
checked against Reproduce: it closes that sequence rather than narrowing it._

- **D1** (owner, 2026-11-10, triage of <source>): <outcome> — <reason>.

## Delivery _(add on delivery; as in `story.md`)_

---

## Won't fix: the closing entry

```md
- **Status**: Won't fix — owner, 2026-11-10 (D2); archived
```

```md
- **D2** (owner, 2026-11-10, <source: grilling Q / PR comment / triage>):
  Won't fix. <Why: accepted behaviour, cost against harm, superseded by a
  platform change.> Reopen if <the trigger, e.g. a user reports it, or the
  library changes its behaviour>. <Where any residue is recorded: ADR-nnn,
  a guide line, a test that pins the accepted behaviour.>
```
