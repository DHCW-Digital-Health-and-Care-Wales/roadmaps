# Delivery run: EPC-011 Adding roadmaps and items

- Run key: 2026-11-14-epc-011-adding-roadmaps-and-items
- Captured at (UTC): 2026-11-15T11:32Z
- Started / stopped (UTC): 2026-11-14T15:55Z / 2026-11-15T11:26Z (the STY-047 retro's merge).
  19 h 31 min.
- Workflow revision: cc81478 at the start. Each per-item retro merged before the next item
  started, so every item ran on the instructions the last one left:
  [#74](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/74)
  (`validation.md`, the story template),
  [#76](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/76)
  (`delegation.md`, `orchestrate`, `quality-review`),
  [#79](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/79)
  (`tests/e2e/AGENTS.md`, `pull-requests.md`),
  [#81](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/81)
  (the epic's `delivery-notes.md`),
  [#84](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/84)
  (`code-review`, `quality-review`),
  [#86](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/86)
  (the review skills, `delegation.md`, `orchestrate`, `brief.md`),
  [#88](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/88)
  (`delegation.md`),
  [#90](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/90)
  (`implement-story`, `copywriter`, `orchestrate`) and
  [#93](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/93)
  (`validation.md`, `delivery-notes.md`, the defect template).
- Scope and policy:
  - Queue: STY-040, STY-041, STY-042, CHO-011 (added by the owner during STY-042, "to do
    next"), STY-043, STY-044, STY-045, STY-046, STY-047. STY-048 to STY-050 are Needs
    grilling and were not queued.
  - Merge: authorized by the owner for the queue. The top-level orchestrator babysat each
    primary and per-item retro PR to green and squash-merged it before the next item
    started. This record's PR is left open.
  - Owner's priority: refactoring and code quality, carried in every brief; the quality
    lane's findings on duplication and leftover code were must-fix.
  - Sessions and models: one top-level orchestrator thread per item, Sonnet 5.5 at medium
    effort. Delivery and retro agents Fable 5.2 at high effort, by the owner's instruction,
    whatever each record's Suggested model. Correctness Opus (native `code-reviewer`) and
    Sol (`gpt-6.1-sol`, Codex, high); quality Sonnet (native `quality-reviewer`). No Sol
    review moved to another provider.
  - Stop: after the queue.
- Outcome: completed. Nine items and nine per-item retros merged. EPC-011 stays Active for
  STY-048 to STY-050. Pending for the owner: the list under Follow-up work.
- Coverage:
  - Sources: the run's progress log, run handoff, shared brief, child handoffs, delivery
    and retro reports, eight outgoing orchestrators' reports, and PR, commit and check
    state on GitHub.
  - `metrics.md` held its header only. The orchestrators logged their own `merge` and
    `ci-wait` stages for the first four items and none after; merge and check times here
    are GitHub's. The final item's orchestrator wrote no report.
  - Usage: partial. Native Claude reviewers reported tokens on eight of nine deliveries
    and Opus on every retro (per item below). Nothing reported usage for the delivery or
    retro agents, the orchestrators or any Sol reviewer. No session reported cost.
  - Pushes: a push is inferred from a commit dated after its PR opened, or from GitHub's
    force-push event; none was watched directly.

## Items

Durations are elapsed minutes. Every primary PR drew no bot or human comment and no
review on GitHub, and Verify and E2E (Playwright) were green on the merged head; no failed
check run is recorded. On no item did a fix worker run or a fix push follow a CI or bot
finding, so those lines are left out below. Each primary PR gained its record-only
`Delivered` commit just after it opened, #92's with its rebase.

### STY-040 The repository adds a roadmap

- Type / risk: story; a domain port change (`addRoadmap`), a new write to the shared
  spreadsheet (an index row and a copied `Template` tab), five ADR amendments. No UI.
- PR / assessed head / outcome: [#73](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/73),
  e180fec, merged as 64d89bb.
- Timing: delivery 55 (16:00–16:55): reading 8, implementation 22, reviews and fixes 17.
  PR to merge 15: CI was green after 4, and the rest waited on a hand-back notification
  that never came. Retro 16. Total 84.
- Reviews: 6 tasks (round 1 in three lanes, Sol and Sonnet re-checks, Sol's final fresh
  pass). Accepted: 1 P2 (two frozen rows made every add fail; Opus raised the same as a
  P3, counted once), 2 P3, 3 🟡 and 3 💭, all fixed. Not fixed: 1 P3 (`History` may be
  refused by Google: unverified, moved to CHO-010) and 2 💭, one declined and one accepted
  as it stood.
- Escapes: none observed.
- Recovery: the child's final hand-back raised no completion notification; the
  orchestrator resumed on the owner's "Status ?".
- Human interventions: 1 (that message).
- Retro: [#74](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/74),
  merged as 48b35d8: a Markdown-only head skips the full gate; a story's real-Google
  unknowns are owner questions. 2 reviewer tasks; 2 P3 fixed.
- Evidence limits: tokens Opus 113.9k, Sonnet 135.4k; retro Opus 39.2k. The checks against
  a real spreadsheet were not run (CHO-010). Adapter tests followed the code.

### STY-041 A Product Lead adds a roadmap

- Type / risk: story; the app's first dialog form, new UI and copy in English and Welsh,
  the expired session inside a dialog.
- PR / assessed head / outcome: [#75](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/75),
  1ed55b0, merged as 099ae1d.
- Timing: delivery 115 (17:25–19:20), 36 of it a usage limit: reading and before captures
  9, implementation 63, verification 17, reviews and fixes 23. PR to merge 22: CI was
  green after 5, and the rest waited for the fallback wake, the notification again
  missing. Retro 17. Total 154.
- Reviews: 6 tasks (round 1 in three lanes; Sol's re-check, final fresh pass and that
  pass's re-check). Accepted: 4 P2 (3 fixed; 1 excepted as DEF-006), 2 P3 and 4 💭 fixed.
  1 💭 left on the reviewer's advice.
- Escapes: the quality reviewer reported about half of the added lines unread, and the
  lane was counted as passed. The retro's catch-up quality review of those files found
  3 🟡 and 3 💭 after the merge, recorded as CHO-011 and delivered in this run.
- Recovery: 1 usage limit (17:43–18:20). The runtime resumed the child itself; the
  orchestrator, which had not read its status, started a replacement 9 seconds later. The
  replacement saw a second writer, stood down without an edit and was cancelled.
- Human interventions: 0.
- Retro: [#76](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/76),
  merged as f5a97e7: a `failed` child is not yet terminal; an unread part of a diff is
  unreviewed; the fallback wake goes from 45 to 15 minutes; CHO-011. 3 reviewer tasks;
  3 P3 fixed.
- Evidence limits: tokens Opus 95.4k, Sonnet 71.9k; retro Sonnet 86.9k, Opus 67.4k.

### STY-042 A roadmap's page shows About in a panel, and says when it is empty

- Type / risk: story; page layout, one shared panel component, copy.
- PR / assessed head / outcome: [#78](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/78),
  a490605, merged as a10192b.
- Timing: delivery 45 (19:59–20:44): reading and before captures 5, implementation 11,
  verification 6, reviews and fixes 15, final gate, captures and PR 8. PR to merge 9.
  Retro 36. Total 88.
- Reviews: 5 tasks (round 1 in three lanes, Sonnet's re-check, Sol's final fresh pass).
  Accepted: 1 P3, 2 🟡 and 6 💭, all fixed. 1 💭 left as advised. Sol found nothing.
- Escapes: none in code. Opus's handed-off note (status panels rounded, cards square) got
  no fix, record or decline in the delivery; the retro recorded it as DEF-007.
- Recovery: none in the delivery. The retro's branch conflicted with
  [#77](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/77)
  (DEF-006 archived, merged by the owner meanwhile) and was rebased.
- Human interventions: 0. The owner's triage of DEF-006 and the addition of CHO-011 to
  the queue arrived during this item.
- Retro: [#79](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/79),
  merged as 858be74: an updated snapshot's dates go back; a handed-off item gets a fix, a
  record or a decline; DEF-007. 3 reviewer tasks; 1 P2 and 3 P3 fixed, 1 P3 fixed after
  the cap.
- Evidence limits: tokens Opus 66.5k, Sonnet 85.6k; retro Opus 114.1k.

### CHO-011 The dialog tests share one way to open a dialog, one focus tour and one set of fixtures

- Type / risk: chore; test code and records only.
- PR / assessed head / outcome: [#80](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/80),
  d610c63, merged as 697fcc5.
- Timing: delivery 46 (21:27–22:13): reading 10, implementation 10, verification 5,
  reviews and fixes 16, final gate and PR 5. PR to merge 5. Retro 81, about 50 of it a
  usage limit. Total 132.
- Reviews: 5 tasks (round 1 in three lanes, Sol and Sonnet re-checks; no fresh pass, since
  no fix changed runtime behaviour). Accepted: 1 P2 (the dialog tour skipped a control out
  of the Tab order), 1 P3, 1 🟡 and 3 💭 fixed; 1 💭 accepted as it stood. Declined: 1 💭.
- Escapes: none observed.
- Recovery: 1 owner question during the delivery (run the add-a-roadmap journey once?),
  answered in 21 minutes and delivered in the PR. In the retro, a Claude usage limit
  stopped both Opus reviewers at their start and then the retro agent; nothing was
  replaced, and all resumed after the reset at 23:20.
- Human interventions: 2. In the delivery, the answer that cut the journey's per-theme
  and per-device runs and its geometry checks. On the retro's PRs, the owner's answers
  that the once-only journey holds for the later dialogs and that CHO-014 waits.
- Retro: [#81](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/81),
  merged as 4a3fb4e: a dialog's Playwright journey runs once. With it
  [#82](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/82),
  merged as 639c391: CHO-014. 4 reviewer tasks over the two; 5 P3 fixed. Each PR took one
  later push for an owner's answer, after the review cap.
- Evidence limits: tokens Opus 100.2k, Sonnet 122.1k; retro Opus 132.8k.

### STY-043 "About this roadmap" is edited in the roadmap dialog

- Type / risk: story; an in-place form replaced by the roadmap dialog and deleted; copy.
- PR / assessed head / outcome: [#83](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/83),
  abccab1, merged as d579205. Reviews ended at 3257bab; the two later commits change a
  comment's wrapping and the record.
- Timing: delivery 64 (23:39–00:43): reading and before captures 7, implementation 19,
  verification 8, reviews and fixes 21, final gate, captures and PR 7. PR to merge 6.
  Retro 16. Total 84.
- Reviews: 8 tasks. Round 1 had three lanes, plus a fresh Opus pass and a fresh Sonnet
  pass over the parts each first reviewer left unread; Opus and Sonnet re-checks; Sol's
  final fresh pass. Accepted: 1 P2 (the record cited a test that did not exist), 2 P3,
  2 🟡 and 6 💭, all fixed. Declined: 3 💭. Sol found nothing.
- Escapes: none observed.
- Recovery: none.
- Human interventions: 0.
- Retro: [#84](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/84),
  merged as 63bfa24: a reviewer reads a diff in pieces that arrive whole; `code-review`
  checks the records in any diff. 2 reviewer tasks; no findings.
- Evidence limits: tokens Opus 281.0k, Sonnet 158.3k; retro Opus 43.5k. Nothing ran in
  Safari or WebKit, which DEF-008 concerns.

### STY-044 An item is edited in a dialog

- Type / risk: story; the card's in-place form replaced by the item dialog and deleted,
  with `useEditMode` and the card hold; focus return; copy.
- PR / assessed head / outcome: [#85](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/85),
  2e253b6, merged as d975ef0. Reviews ended at 3a78cd8.
- Timing: delivery 75 (01:04–02:19): reading and before captures 7, implementation 32,
  verification 8, reviews and fixes 18, final gate, captures and PR 9. PR to merge 6.
  Retro 20. Total 99.
- Reviews: 6 tasks (Opus, Sol, and four Sonnet: round 1, a fresh pass over its unread
  parts, a re-check, and a pass over the record rows; no fresh correctness pass).
  Accepted: 2 P3, 6 🟡 and 4 💭, all fixed. Excepted: 1 🟡 (building the add-and-edit
  union now), left to STY-046, which built it. Sol found nothing.
- Escapes: none observed.
- Recovery: 1 usage limit (01:25), with no pending run. The orchestrator messaged the same
  child: a first message was refused, and a later one resumed it, at 01:26 by the child's
  log. The item brief named STY-043's branch; the child used the checkout's.
- Human interventions: 0.
- Retro: [#86](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/86),
  merged as d453a2c: a reviewer reads a saved output back; a worker stopped by a usage
  limit is resumed by message; the brief's branch comes from the run handoff. 3 reviewer
  tasks; 1 P2 and 3 P3 fixed.
- Evidence limits: the delivery report gives no reviewer tokens; retro Opus 79.0k.

### STY-045 The repository publishes a new item

- Type / risk: story; a domain type change (`RoadmapChanges.newItems`) and a change to the
  data source's format, the contract with the public site: publishing now adds item rows.
  No UI.
- PR / assessed head / outcome: [#87](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/87),
  9bed679, merged as 2d3ba9e.
- Timing: delivery 57 (02:44–03:41): reading 6, implementation 16 (58 tests red first),
  verification 5, reviews and fixes 22, after-cap fixes with a third gate and the PR 6.
  PR to merge 6. Retro 28. Total 90.
- Reviews: 7 tasks (Opus, Sol twice, and four Sonnet: round 1 and its re-check each
  needed a fresh pass over parts left unread). Accepted: 1 P2 (resolved by correcting the
  documents and pinning the behaviour with a test), 1 P3, 3 🟡 and 7 💭, fixed. Declined:
  1 🟡 (the new-item rules stay in the domain, reason recorded) and 2 💭. Two comment
  fixes after the cap had no review.
- Escapes: none observed.
- Recovery: 1 owner question (where Google's `appendCells` places the row), which an
  earlier owner decision already answered; that decision was in the run handoff only, so
  the child had not seen it. The PR merged on the earlier decision.
- Human interventions: 0.
- Retro: [#88](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/88),
  merged as a842f37: a reviewer's brief asks what it left unread; CHO-016. 3 reviewer
  tasks; 1 P2 and 4 P3 fixed, the last of them after the cap. Four Sonnet trial reviewers
  tested a reworded reading step: none read the file, two claimed a full read; the
  wording was dropped.
- Evidence limits: tokens Opus 155.4k, Sonnet 273.7k; retro Opus 103.6k, and 225.7k over
  the four trial reviewers. The check against a real spreadsheet was not run (CHO-015).

### STY-046 A Product Lead adds an item

- Type / risk: story; the item dialog extended to add, new pending-state rules, new UI,
  ten new or changed strings in English and Welsh.
- PR / assessed head / outcome: [#89](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/89),
  07e013e, merged as 6ac6095.
- Timing: delivery 190 (04:14–07:24), 93 of it a usage limit: reading and before captures
  13, implementation 121, verification 12, reviews and fixes 37, captures and PR 4. PR to
  merge 85, of which CI 5 and the rest a hold for the owner's answer. Retro 20. Total 294.
- Reviews: 8 tasks (round 1 in three lanes and a fresh Sonnet pass over its unread parts;
  three re-checks; Sol's final fresh pass). Accepted: 2 P2. One, focus left on the page
  body, was raised by Opus and Sol, fixed, reopened by Sol's re-check for a second path
  and fixed again after the cap with tests run red first. The other is excepted as
  DEF-009. 4 🟡 and 2 💭 fixed. Declined: 4 💭.
- Escapes: none observed.
- Recovery: 1 usage limit (04:47–06:20); the child had a pending run, was not replaced and
  the runtime resumed it. It wrote its handoff record 31 minutes in, 104 seconds before
  the limit. One owner question could change the PR (both "Add an item" buttons on an
  empty roadmap, or one), so the merge was held.
- Human interventions: 1 (the answer: keep both).
- Retro: [#90](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/90),
  merged as 4979012: a fix answers a finding's cause; a deliberate break is undone from a
  saved copy; Welsh doubts go to the PR's Copy section; the pending-add copy pattern.
  3 reviewer tasks; 1 P2 and 1 P3 fixed.
- Evidence limits: tokens Opus 279.6k, Sonnet 269.9k; retro Opus 117.6k.

### STY-047 The publish dialog names the new items

- Type / risk: story; the publish dialogs' list, one shared component, copy.
- PR / assessed head / outcome: [#92](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/92),
  64aaa9a, merged as 9b46d66. Reviews ended at 6217e13; the head is that work rebased.
- Timing: delivery 68 (09:08–10:16): reading and before captures 5, implementation 16,
  verification 9, reviews and fixes 25, PR, rebase and a third gate 7. PR to merge 60, of
  which CI 9 and the rest a hold for the owner's answer. Retro 16. Total 138.
- Reviews: 6 tasks (round 1 in three lanes, Sol and Sonnet re-checks, Sol's final fresh
  pass). Accepted: 1 P2 ("Publish roadmap" kept the list it had when it opened), 1 P3,
  2 🟡 and 5 💭, fixed. The P3, a claim in DEF-010, was reopened in part by Sol's re-check
  and corrected after the cap, record only. Declined: 1 💭.
- Escapes: none observed.
- Recovery: head drift.
  [#91](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/91),
  an unqueued fix, merged to `main` during review round 2; the final gate ran without a
  fetch, so the PR opened on a stale base and took a rebase, a force push and one more
  gate. One owner question could change the PR ("Publish roadmap" keeps the list, or its
  count alone), so the merge was held.
- Human interventions: 1 (the answer: keep the list).
- Retro: [#93](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/93),
  merged as a04314d: fetch the base before the gate of a head to push; each dialog gets a
  test of a read landing while it is open; a defect names every way to its cause.
  2 reviewer tasks; no findings.
- Evidence limits: tokens Opus 88.3k, Sonnet 117.2k; retro Opus 56.0k.

## Learnings and next evaluation

- Totals: 57 reviewer tasks on the deliveries and 25 on the retros. Accepted on the
  deliveries: no P0 or P1; 11 P2 (9 fixed, 2 excepted as DEF-006 and DEF-009); 12 P3 and
  23 🟡 fixed. Seven of the nine deliveries made a fix after their review cap, with no
  review of its own: wording, comments or a record on STY-040, STY-042, CHO-011, STY-043,
  STY-045 and STY-047, and on STY-046 the reopened P2 with its tests. So did retro PRs
  #79, #81, #82 and #88.
- What helped:
  - Merging between items kept each on a fresh `main`: every merged head was green, and no
    CI or bot finding needed a fix push.
  - Per-item retros changed the next item's run. After #76, three more usage-limit stops
    were waited out or resumed with no replacement, and an unread part of a diff got a
    fresh same-model pass in the same round on STY-043 to STY-046.
  - CHO-011 ran before the three dialog stories, which imported its helpers.
  - The quality priority held: each story that replaced a form deleted it in the same PR,
    and each delivery report names what still falls short.
- Time spent waiting, about 5.7 of the 19.5 hours:
  - Usage limits stopped work four times, for about 36, 50, 1 and 93 minutes.
  - The owner's answer held two merges for about 80 and 51 minutes after CI was green.
    That is the policy for an answer that can change the PR.
  - Two final hand-backs raised no notification (STY-040, STY-041): 12 and 20 minutes
    idle after the hand-back. The cause is unfound; no later hand-back waited longer than
    the 15-minute wake.
- Other avoidable cost:
  - The quality reviewer left parts of the diff unread on five of nine items (STY-041,
    STY-043 to STY-046), costing at least five extra Sonnet passes and the rework CHO-011
    delivered. CHO-016 puts the reviewer's model and effort to the owner.
  - `main` moved under the run twice (#77, #91), each costing a rebase and a gate.
  - Tests followed the code in part on STY-040 and STY-047, the standing question of
    [CHO-008](../../backlog/chores/CHO-008-settle-the-test-first-rule.md).
- Orchestration retro, in this record's PR: `metrics.md` is removed from `orchestrate` and
  `run-summary.md`. It held no entries in this run or in EPC-007's, was not kept in
  EPC-008's and stopped part-way in EPC-003's; each record was built from the progress
  log, the handoff, the reports and GitHub. Considered and left as they are:
  - Missed hand-back notifications, a `failed` child that is not terminal, and a limited
    worker resumed by message: #76 and #86 hold them, and they held from then on.
  - Interim yields that look like completions: the handoff's hand-back mark and the
    progress log told them apart each time, as `brief.md` sets.
  - An owner decision carried in the run handoff alone (STY-045): one redundant question,
    no delay. `brief.md` already sends each item's learnings to the shared brief.
  - A handoff record written late (STY-046) or left stale (STY-041): the rule exists; the
    STY-047 child kept it.
  - The orchestrators' missing `merge` and `ci-wait` log lines: GitHub holds those times.
- Follow-up work, the owner's, now the queue is done:
  - Check the two writes against a real test spreadsheet:
    [CHO-010](../../backlog/chores/CHO-010-check-adding-a-roadmap-against-a-real-spreadsheet.md)
    and
    [CHO-015](../../backlog/chores/CHO-015-check-adding-an-item-against-a-real-spreadsheet.md).
  - Triage
    [DEF-008](../../backlog/defects/DEF-008-focus-is-lost-after-add-a-roadmap-closes-in-safari.md),
    [DEF-009](../../backlog/defects/DEF-009-a-published-new-item-is-not-shown-when-the-read-after-it-fails.md)
    and
    [DEF-010](../../backlog/defects/DEF-010-a-publishing-dialog-changes-what-it-shows-once-written.md).
    [DEF-007](../../backlog/defects/DEF-007-status-panels-have-rounded-corners.md) is also
    still Needs triage; the last handoffs' lists dropped it.
  - Decide
    [CHO-016](../../backlog/chores/CHO-016-the-quality-reviewer-reads-the-whole-diff.md)
    (Needs grilling).
  - Close
    [CHO-007](../../backlog/chores/CHO-007-rebase-an-open-date-form-after-marking-updated.md)?
    Its path is now reachable only if the dialog opens while a publish is being written.
  - A fluent read of the Welsh, all machine-assisted: "Eitem newydd" (STY-047), "Golygu'r
    eitem hon" (STY-044) and STY-046's ten strings, with the reviewers' doubts in #89's
    Copy section. Also unread: `roadmaps.add.*` (STY-041), STY-042's two strings and
    "Golygu'r map trywydd hwn" (STY-043).
  - Other records the run raised:
    [DEF-006](../../backlog/_archive/defects/DEF-006-a-refused-reconnect-drops-the-add-a-roadmap-dialog.md)
    (Won't fix, archived),
    [CHO-012](../../backlog/chores/CHO-012-the-other-tests-use-the-shared-fixtures.md) and
    [CHO-013](../../backlog/chores/CHO-013-the-page-focus-tour-tells-its-stops-apart.md)
    (Proposed), and
    [CHO-014](../../backlog/chores/CHO-014-slim-the-e2e-suite.md) (Proposed; not to be
    selected until its measurements grow).
- For whoever closes EPC-011: where each note in its `delivery-notes.md` goes, as #93
  sorted them. Nothing moves while STY-048 to STY-050 remain.
  - To `tests/e2e/AGENTS.md`, as rules without their history: a dialog's Playwright
    journey runs once, at the default size and theme; a dialog's specs use the helpers in
    `fixtures/dialogs.ts`; a spec that replaces `sheets.spreadsheet` keeps a `Template`
    tab and uses `withTabItems` or `withTabRows`; the page behind an open dialog is out of
    reach of role queries.
  - To a docblock at the code, after checking what each already says: the Sheets fake's
    refusal of a bad appended row; "only a new item's ID says it was published";
    `FormDialog`'s closing and focus rules and its `opener` (Safari); `EditForm` as a
    dialog's form and `takesFocus`; `ItemForm` as both forms; `useItemDialog` as the
    page's; `PageItem`, `editPageItem` and `dropPageItem`; `WhatChanges` as the one list;
    `discardable`; `holdRefresh`, `readAgain` and `holdCall`.
  - To a guide, since no `AGENTS.md` covers `src/features/` yet: a read can land while a
    dialog is open, so each dialog gets a test of one; `user.selectOptions` matches an
    option's text as HTML.
  - Dropped with the epic: the pointers to archived contracts (STY-040, STY-041, STY-045,
    CHO-011); the two notes the typecheck enforces (`addRoadmap`, `newItems`); "nothing
    here has met a real spreadsheet", which CHO-010 and CHO-015 hold; DEF-008's clause
    once it is fixed.
- Next comparison: on the next queue, whether the fetch before a head's gate (#93) ends
  rebases after a PR opens, and whether the owner's CHO-016 decision cuts the fresh passes
  over unread parts, counted against this run's five items of nine.
