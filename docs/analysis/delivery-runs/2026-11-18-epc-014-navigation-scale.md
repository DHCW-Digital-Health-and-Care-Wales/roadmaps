# Delivery run: EPC-014 A navigation that scales

- Run key: 2026-11-18-epc-014-navigation-scale
- Captured at (UTC): 2026-11-18T15:11Z
- Started / stopped (UTC): 2026-11-18T10:06Z (STY-061's first log line) / 15:06Z (STY-064's
  merge), 5 h 0 min. The four per-item retros had ended, all no-ops, by capture.
- Workflow revision: 4c9224d at the start. Merged to `main` during the run, outside the
  queue:
  [#153](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/153)
  (the EPC-011 and EPC-012 retros: class-variable lint, Markdown link check, sharper review
  lenses; 10:41Z, during STY-061, which rebased onto it),
  [#154](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/154)
  (a port pair per worktree; 10:55Z, STY-061 rebased again),
  [#156](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/156)
  (STY-059),
  [#158](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/158)
  (STY-060, which STY-064 preferred delivered first) and
  [#160](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/160)
  (docs-only PRs run only the docs checks).
- Scope and policy:
  - Queue: STY-061, STY-062, STY-063, STY-064, in that order; stop after the four.
  - Merge: authorized by the owner for the story PRs; the top-level orchestrator babysat
    each to green and squash-merged it before the next item started. Retro and
    orchestration PRs left open.
  - Defects: recorded `Needs triage` and reported; none was found.
  - Sessions and models: one top-level orchestrator session per item, Sonnet 5.5 at medium
    effort. Delivery Opus 5.5 at high effort for STY-061 and Sonnet 5.5 at high effort for
    the other three, by each record's Suggested model. Correctness Opus (`code-reviewer`)
    and Sol (`gpt-6.1-sol`, Codex, high); quality Sonnet 5.5 at high effort
    (`quality-reviewer`). Per-item retros Sonnet 5.5 at high effort; this record and the
    orchestration retro Opus 5.5 at high effort. No lane moved to another model.
  - Owner's changes during the run: from STY-061 on, the machine was under heavy load, so
    heavy commands and reviewers ran one at a time, every lane kept. During STY-064, a
    delivery PR makes no incidental guide change (to any `AGENTS.md`, `CLAUDE.md`, skill
    or agent definition); only a retrospective does, in its own PR. After capture the owner
    narrowed it: a delivery whose record or request names a guide change makes it.
- Outcome: completed. Four stories merged; EPC-014 is Done and archived with STY-064. Every
  per-item retro was a no-op, so no retro PR was raised. This record's PR also writes the
  owner's guide-file rule into the repository.
- Coverage:
  - Sources: the run's progress log, run handoff, shared brief, child handoffs, the four
    delivery reports, the STY-062, STY-063 and STY-064 retro reports, STY-064's guide
    proposals, and PR, commit and check state on GitHub.
  - STY-061's retro wrote no report; its outcome and reasons are in the run handoff. No
    outgoing orchestrator wrote its own report file; each recorded "no friction" in the
    run handoff.
  - Usage: partial. Native Claude reviewers reported tokens on every item (below). Nothing
    reported usage for the delivery agents, the orchestrators, the retros or any Sol
    reviewer. No session reported cost.
  - Interim yields: unknown; no report counts them.
  - Retro durations: unknown. No retro logged a start, and the STY-062 retro's one log line
    is a minute after its merge.

## Items

Durations are elapsed minutes; a phase list leaves out short gaps between stages. Every
story PR drew no comment and no review on GitHub. Each PR's opening push was followed
within a minute by its record-only Delivered commit, the standard second push, whose CI run
superseded the first. CI (Verify, E2E) passed on every run that completed, first time, so
bot status at readiness was completed on the current head for all four. No report or log
records a usage limit. A load-induced focus-assertion flake, the class DEF-013 and CHO-018
already record, appeared in STY-062's and STY-063's full E2E runs and passed alone.

### STY-061 A Product Lead finds a roadmap by searching the navigation

- Type / risk: story; a search above routes shared by sidebar, rail and drawer, a debounced
  polite live region, accent- and case-blind matching, copy in English and Welsh.
- PR / assessed head / outcome:
  [#155](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/155),
  a459e1b, merged as 352cc65. Reviews ended at 57e108b; a459e1b is record-only.
- Timing: delivery 95 (10:06–11:41): reading and before captures 3, implementation 25,
  verification with two rebases 33, review round 1 17, round 2 and fresh pass 5, after
  captures, final gate and PR 12. CI wait 6, PR to merge 6. Total 101.
- Reviews: 6 tasks (round 1 in three lanes; Sol's and Sonnet's re-checks; Sol's final fresh
  pass). Accepted: 1 P2 (a search kept past Disconnect said "No roadmaps match" while
  hidden), 2 P3, 2 🟡 and 2 💭, fixed. Declined: 1 💭 and a handed-off note.
- Escapes: none observed.
- Rework: no fix worker, no fix push.
- Recovery: the base moved twice (#153, #154), rebased before pinning. An early full unit
  run had 77 timeouts at load average 32; they passed on rerun.
- Human interventions: 1 (the owner's load note: one heavy command and one reviewer at a
  time).
- Retro: no-op (base moves and load timeouts handled correctly; no recurring review lens).
- Evidence limits: tokens Opus 88.9k, Sonnet 82.2k and 28.5k. The PR edited the copywriter
  skill's `references/patterns.md`, as that skill then asked, before the owner's guide-file
  rule.

### STY-062 A Product Lead closes the families they don't need

- Type / risk: story; per-family close and Close all/Open all, closed families remembered in
  `localStorage`, a changed-roadmap dot on a closed family, a new `navigation` button
  variant, copy.
- PR / assessed head / outcome:
  [#157](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/157),
  1b96248, merged as 3266624. Reviews ended at 7cb5eef; 1b96248 is record-only.
- Timing: delivery 50 (11:49–12:39): reading and before captures 2, implementation 4,
  verification 15, a 5-minute gap, review round 1 6, fixes and second full gate 13, after
  captures, round 2 and final pass 5. CI wait 7, PR to merge 9. Total 58.
- Reviews: 5 tasks (round 1 in three lanes; Sonnet's re-check; Sol's final fresh pass, run
  because a fix moved the closed-family state into a hook). Accepted: no P0–P3; 4 🟡 and
  5 💭, fixed. Declined: 1 💭 and 1 Opus note.
- Escapes: none observed.
- Rework: no fix worker, no fix push.
- Recovery: rebased once over #156. One focus flake in a full E2E run.
- Human interventions: 0.
- Retro: no-op (one load-induced flake of a known class; findings one-off judgements).
- Evidence limits: tokens Opus ~74k, Sonnet ~55k and ~35k. The PR edited the copywriter
  skill's `references/patterns.md`, before the guide-file rule.

### STY-063 A Product Lead shows only the roadmaps with unpublished changes

- Type / risk: story; the count becomes a pressed toggle that narrows the navigation, its
  interplay with the search, rail and drawer, the round-robin to the next changed roadmap
  deleted, copy.
- PR / assessed head / outcome:
  [#161](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/161),
  fda3f12, merged as 82bd14f. Reviews ended at 377ccc5; fda3f12 is record-only.
- Timing: delivery 66 (12:49–13:55): reading and before captures 3, implementation 8,
  verification 15, after captures and review round 1 9, fixes, rebase and second full gate
  11, round 2 and Sol's final pass 18, retaken captures and PR 1. CI wait 6, PR to merge 10. Total 76.
- Reviews: 5 tasks (round 1 in three lanes; Sonnet's re-check; Sol's final fresh pass).
  Accepted: 1 P3, 3 🟡 and 5 💭, fixed, plus a double announcement found as a handed-off
  note and fixed with a regression test. Declined: 2 💭 and 1 note.
- Escapes: none observed.
- Rework: no fix worker, no fix push.
- Recovery: STY-060 merged mid-review; the rebase onto it and a fix that moved the press
  rule forced the second full gate. One focus flake in a full E2E run.
- Human interventions: 0.
- Retro: no-op (one-off findings; the second gate is the quality lane working).
- Evidence limits: tokens Opus ~90k, Sonnet ~106k and ~94k.

### STY-064 A Product Lead drags the navigation to the width they want

- Type / risk: story; a hand-built WAI-ARIA window splitter (pointer, touch, keyboard),
  width remembered in `localStorage`, a layout custom property, ADR-010 amended, copy; the
  epic closed and archived with its delivery notes swept.
- PR / assessed head / outcome:
  [#162](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/162),
  411addc, merged as 87f29d0. Reviews ended at 6fafe1e; 5ec0bc8 is record-only and 411addc
  reverts `tests/e2e/AGENTS.md`.
- Timing: delivery 44 (14:07–14:51): reading and before captures 2, implementation 6,
  verification 8, review rounds and final gate 26 (reviewers one at a time), PR 2. CI wait
  14 over two runs, PR to merge 16. Total 59.
- Reviews: 6 tasks (round 1 in three lanes; Sol's and Sonnet's re-checks; Sol's final fresh
  pass). Accepted: 1 P2 (a drag ended by unmounting stored no width; Sol), 2 🟡 and 6 💭,
  fixed. Declined: 1 💭.
- Escapes: none. The guide-file edit is counted as an intervention: the rule it broke was
  issued while the delivery ran, after its brief was read, so no reviewer was asked to
  check it.
- Rework: 1 fix push (411addc), reverting the epic-close sweep's three lines in
  `tests/e2e/AGENTS.md`; checked with the build tests, no review.
- Recovery: none.
- Human interventions: 1 (the guide-file rule: the edit was seen by chance and reverted, its
  lines saved for the retro).
- Retro: no-op. It weighed the three reverted lines and dropped each: one fails the recur
  bar, one is taught by the first failing query, and one a strict-mode error already
  enforces (and would have gone stale).
- Evidence limits: tokens Opus ~91k, Sonnet ~71k and ~62k.

## Learnings and next evaluation

- Totals: 22 reviewer tasks. Accepted: no P0 or P1; 2 P2, 3 P3, 11 🟡 and 18 💭, all fixed;
  8 declined with reasons. Sol alone found both P2. No escape after the reviews' last head;
  every merged head passed CI first time.
- What helped:
  - Merging between items kept each story on a fresh `main`, as in EPC-012.
  - Running one heavy command and one reviewer at a time under load kept every gate green
    after STY-061's timeouts, at a cost of a few minutes a round.
  - Each later item extended the search, storage and narrowing STY-061 built rather than
    adding its own, as the shared brief asked; no review found a duplicate.
- Avoidable cost:
  - A delivery edited a guide file twice by instruction, not by error: the epic-close sweep
    in `docs/AGENTS.md` sent STY-064's repo-wide notes to `tests/e2e/AGENTS.md`, and the
    copywriter skill asked STY-061 and STY-062 to add their patterns to its
    `references/patterns.md`. Only the first was caught, by chance, at a cost of one push
    and one CI run (7 minutes).
  - A second full gate after a mid-review rebase or a structure-moving fix, in STY-062 and
    STY-063 (13 and 11 minutes); the retros judged it the lanes working.
- Orchestration retro, in this record's PR: the owner's guide-file rule. The authoring guide
  (`docs/operations/authoring-agent-instructions.md`, _Where it goes_) defines a guide file
  and an incidental change to one, and states the rule. `delegation.md` tells a delivery
  PR's reviewers to report an incidental guide change as a blocker; `pr-watch.md`'s Done list checks the PR's file list before merging. The two
  instructions that led deliveries to edit guide files, the epic-close sweep in
  `docs/AGENTS.md` and the copywriter skill's patterns line, now hand those edits to the
  retrospective, as does the quality-review lens on text a change makes false, which asked
  for the same edit. `orchestrate`'s brief needs no line: every delivery agent reads
  `delegation.md`. Considered and left as they are:
  - Outgoing orchestrators recorded their retro in the run handoff, not in their own report
    file. Nothing was lost, since each was a no-op; one-off.
  - The second full gate: two data points with a base move confounding one.
- Follow-up work: none. A chore whose scope is itself a guide change, such as
  [CHO-016](../../backlog/chores/CHO-016-the-quality-reviewer-reads-the-whole-diff.md) or
  [CHO-014](../../backlog/chores/CHO-014-slim-the-e2e-suite.md)'s S6, makes it in its own
  delivery.
- Next comparison: on the next queue with an epic close or new copy, whether any delivery
  PR's file list holds an incidental guide change, and how long the retros take to land the patterns and
  notes the deliveries hand them.
