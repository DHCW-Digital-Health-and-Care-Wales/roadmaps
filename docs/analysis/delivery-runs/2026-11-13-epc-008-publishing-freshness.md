# Delivery run: EPC-008 Publishing and freshness

- Run key: 2026-11-13-epc-008-publishing-freshness
- Captured at (UTC): 2026-11-13T21:00Z
- Started / stopped (UTC): 2026-11-13T18:47Z (first logged stage; the orchestrator's own
  start is not logged) / 2026-11-13T20:55Z (the STY-036 retro's merge).
- Workflow revision: 67a6bb4 at the start. Mid-run changes:
  - During STY-035's delivery, the owner gave screenshot-reading guidance (see Learnings).
    It reached the children through the run's shared brief, not the skills.
  - The STY-036 retro ([#59](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/59))
    changed `screenshots.md` after both deliveries.
- Scope and policy: STY-035 then STY-036. The owner authorized merging for the whole run,
  primary and retro PRs alike: the top-level orchestrator babysat each PR to green and
  squash-merged it before the next started. The orchestration retro's PR is left open.
  Each item ran in its own top-level orchestrator thread. Stop after the queue.
- Outcome: completed. Both stories merged, EPC-008 is closed and archived, and the
  orchestration retrospective is this record's PR. Pending for the owner: the test-first
  decision (CHO-008), the fluent Welsh review and CHO-007 (see Learnings).
- Coverage:
  - Sources: the run's progress log, run handoff, shared brief, child handoffs, delivery and
    retro reports, the outgoing orchestrator's report, and PR and CI state on GitHub.
  - No `metrics.md` was kept; this record is built from the progress log and the reports.
  - Usage: partial. Only some native Claude reviewers reported tokens (below). No session
    reported cost. Nothing reported usage for the delivery children, the orchestrators or
    any Sol reviewer (GitHub Copilot).

## Items

### STY-035 A Product Lead publishes or unpublishes a roadmap

- Type / risk: story; a domain port change (`setRoadmapPublished`), a new write to the
  shared spreadsheet (the index row's `Enabled`), new UI and copy (English and Welsh).
- PR / assessed head / outcome: [#57](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/57),
  eb9bbc3, merged as 926ca6b. Reviews ended at 87ad8f3; a05c7a8 holds a fix after the
  cap and eb9bbc3 a record-only commit.
- Models:
  - Delivery: Opus (high).
  - Correctness: Opus (native `code-reviewer`) and Sol (`gpt-6.1-sol`, GitHub Copilot).
  - Quality: Sonnet (native `quality-reviewer`).
- Timing:
  - Delivery 57 min (18:47–19:44): reading 6, implementation 23, first gate 4, reviews and
    fixes 19, final gate and PR 4.
  - CI wait about 6 min (PR 19:43, merge 19:49).
  - Retro about 2 min.
  - 63 min from the first stage to the retro's end.
- Reviews:
  - Tasks: 7. Round 1 had all three lanes; each lane had a re-check; Sol ran a final fresh
    pass.
  - Accepted: 1 P1, 3 P2, 1 issue raised three times (Opus P3, Sol P2 twice), 1 🟡 and
    5 💭, all fixed. The repeated issue was fixed after the cap, with tests.
  - Declined: 1 (a lost answer between two identical live rows: that index already fails
    the public site's sync).
- Escapes: none observed. CI was green first time; the PR drew no bot or human comments.
- Rework: no fix workers; 0 fix pushes while babysat.
- Recovery: the delivery child yielded 4 times (a gate and three review waits). Each
  yield reached the orchestrator as a completed notification; it checked for pending
  child runs and read the handoff each time before treating it as interim. No failures,
  usage limits or head drift.
- Human interventions: 1. The owner's screenshot-reading guidance, given mid-delivery
  (see Learnings).
- Bot status at readiness: completed-current; no bot review comments.
- Retro: no-op. Its one cross-run finding, tests written after code, went to the owner.
- Evidence limits: no usage reported. Its "dark" captures render the light theme (see
  Learnings).

### STY-036 A Product Lead sets when a roadmap was last updated

- Type / risk: story; a new write to the shared spreadsheet (the index row's
  `Last updated`), a browser-local date rule, new UI and copy (English and Welsh).
- PR / assessed head / outcome: [#58](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/58),
  df4a0ed, merged as fdb30ec. Reviews ended at 296bb91; df4a0ed adds a record-only commit.
- Models: as STY-035, plus a Haiku screenshot checker.
- Timing:
  - Delivery 48 min (19:52–20:40): reading and before captures 4, implementation 17,
    docs and first gate 4, reviews and fixes 18, after captures, final gate and PR about 4.
  - CI wait about 7 min (PR 20:38, merge 20:45).
  - Retro 10 min to its merge (20:46–20:55), including its CI.
  - 64 min from dispatch to the retro's merge.
- Reviews:
  - Tasks: 6. Opus and Sonnet ran round 1 only; Sol ran round 1, a re-check, a final fresh
    pass and that pass's re-check.
  - Accepted: 2 P3 (today's date stale across midnight, the picker's limit stale) and 4 💭.
  - Declined: 2 P2 (a date already held in another format; an open form after its own
    tick-box publish, recorded as
    [CHO-007](../../backlog/chores/CHO-007-rebase-an-open-date-form-after-marking-updated.md))
    and 2 💭.
- Escapes: none observed. CI was green first time; the PR drew no bot or human comments.
- Rework: no fix workers; 0 fix pushes while babysat.
- Recovery: the first set of dark captures rendered light and was recaptured with the
  stored theme. No failures, usage limits or head drift.
- Human interventions: 0.
- Bot status at readiness: completed-current; no bot review comments.
- Retro: [#59](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/59),
  merged as 8a22019. It tells captures to store the dark theme, since the app ignores the
  system's colour scheme (ADR-005). 4 reviewer tasks (Opus, Sol, Sonnet and a Sonnet
  re-check); 1 wording finding accepted, 1 placement finding declined.
- Evidence limits: tokens only for native Claude reviewers: Opus 149k and Sonnet 47k on
  the delivery; Opus 22k and Sonnet 24k on the retro. No cost.

## Learnings and next evaluation

- What helped:
  - Merging between items kept STY-036 on a fresh `main`, and both PRs were green first
    time.
  - The shared brief carried the owner's screenshot guidance to the next child within the
    run, before any skill changed.
  - STY-036's Haiku screenshot checker read 40 after captures and flagged one suspect, a
    crop artifact rather than a fault.
- Avoidable cost:
  - Every interim yield looked like a completion, so each needed a pending-child and
    handoff check before the orchestrator could tell it from a hand-back. This record's PR
    has the child's handoff mark its hand-back, and the brief carry the runtime fact.
  - The orchestrator reports that its fallback wake-up failed on the scheduling tool's
    schedule format, so the run relied on completion notifications alone. The run handoff
    still records the STY-036 wake as set, so it is not evidence that one existed. No
    notification was missed.
  - STY-035's 14 "dark" after captures render the light theme, as do the 2 of them and the
    1 dark before capture published in #57:
    the capture set the system colour scheme, which the app ignores. Its delivery read one
    and did not notice; the STY-036 retro verified one and found the cause. #59 fixed the
    guidance; #57's captures were not recaptured.
- Owner guidance, given during STY-035: capture and publish the full set of screenshots,
  read only a risk-based sample of after captures, and use a cheap read-only checker for
  layout-heavy UI. This record's PR adds it to `screenshots.md`, replacing "open each one
  yourself".
- Follow-up work:
  - [CHO-008](../../backlog/chores/CHO-008-settle-the-test-first-rule.md): both stories,
    like nine before them, wrote some tests after the code and reported it as a departure.
    The owner decides whether to enforce, relax or keep the rule.
  - Fluent Welsh review of both stories' new strings, tracked in the README's Welsh note.
  - [CHO-007](../../backlog/chores/CHO-007-rebase-an-open-date-form-after-marking-updated.md)
    waits for the owner.
- Next comparison: on the next UI items, compare the after captures read and the checker's
  suspects against faults found later in review or by the owner, to see whether the
  risk-based sample misses anything that reading every capture would have caught.
