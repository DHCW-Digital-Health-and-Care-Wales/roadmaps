# Delivery run: EPC-018, seeing where a moved item went (STY-071, STY-072, STY-075, STY-073)

- Run key: 2026-11-19-epc-018-moved-item
- Captured at (UTC): 2026-11-19T18:51Z
- Started / stopped (UTC): 2026-11-19T11:40Z / 2026-11-19T18:47Z (the last retro's
  merge), 427 min.
- Workflow revision: `d048984` at the start. Each item's retro changed the
  instructions mid-run, and each next delivery was cut from the default branch after
  it: STY-071 at `d048984`, STY-072 at `bd635d9` (#187), STY-075 at `b968cd2` (#191),
  STY-073 at `27b0101` (#195). #199 (`2c800ab`) merged after the last delivery.
- Scope and policy: EPC-018's STY-071, STY-072 and STY-073, in that order, each
  depending on the one before; the owner added STY-075 mid-run (#188), queued after
  STY-072. STY-074 was left out (Needs grilling). Merging authorized: each primary
  and retro PR babysat to green and squash-merged before the next item began. Claude
  delivery children with the record's suggested tier; every review on GitHub Copilot;
  one Sonnet (medium) orchestrator session per item. Defects found outside an item:
  recorded as Needs triage, none fixed. Stop after STY-073.
- Outcome: completed. All four stories are Done and merged, each with its retro
  merged. Nothing waits on an unmerged prerequisite. EPC-018 stands at 4 of 5
  terminal; STY-074 still waits for its grilling. Two owner notes stay open (see
  _Follow-up work_).
- Coverage: the run's progress log, handoff and orchestrator reports; each delivery
  and retro report; `gh pr view` for the eight PRs (creation, merge, head, checks,
  reviews, comments). Tokens and cost: unknown for every session, since neither the
  delegation runtime nor Copilot reported usage. Copilot reviewer durations come from
  the progress log for STY-071 and STY-072 only. Pre-PR push counts are unknown: the
  children logged review-fix heads, not pushes. The setup session (records PR #185)
  and this summary's publication are outside the measured totals.

## Items

### STY-071: A Product Lead sees which item they moved, and where it went

- Type / risk: story; Features/UI, i18n (en + cy), E2E; new page state, a reveal
  scroll and two shadow tokens.
- PR / assessed head / outcome:
  [#186](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/186),
  `92d343e` (reviewed `ba6e25b` plus a record-only Delivered commit), merged as
  `1646213`.
- Models: delivery Opus (high); correctness Opus and Sol (`gpt-6.1-sol`), quality
  Sonnet (high), all on Copilot; no fix workers.
- Timing: delivery 108 min (reading 5, implementation 22, verification 5, reviews and
  their fixes 74, PR 2); CI wait 10 (PR open to merge); retro 8; item total 125.
- Reviews: 8 reviewer tasks. Correctness Opus: round 1 and a re-check. Sol: round 1, a
  re-check, a final fresh pass (logic changed in fixes) and its re-check. Quality: round
  1 and a re-check. Accepted: P2 ×8 (one raised by both correctness reviewers), P3 ×3,
  🟡 ×4, 💭 ×10. Declined: P2 ×1 (a co-lead completing the marked move while an
  unrelated destination order is pending; rare, and the same state the record keeps for
  a move back), P3 ×1, 💭 ×2. The final fresh pass and its re-check found three P2s
  after round 2, all in the reveal's and mark's cancellation.
- Escapes: none; CI green at first run on the merged head, no reviews or comments.
- Rework: three review-fix heads before the PR; no pushes after it.
- Recovery: none.
- Human interventions: 0.
- Bot status at readiness: completed-current, all checks green.
- Retro:
  [#187](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/187),
  merged as `bd635d9`: the moved-mark copy pattern in the copywriter's patterns, and an
  epic delivery note that a move's cancel stops only its own work. Reviewed by Opus and
  Sol (docs-only lane): P3 ×2 and two handed-off nits, fixed.
- Evidence limits: no usage units; no compaction observed.

### STY-072: A Product Lead sees a moved item travel to its new place

- Type / risk: story; Features/UI, global CSS, E2E; view transitions with `flushSync`,
  no new dependency.
- PR / assessed head / outcome:
  [#190](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/190),
  reviewed `b96f8ae`, handed back at `0df6dec`, merged from `e781a37` (a rebase over
  docs-only `main`) as `108b3b8`.
- Models: delivery Opus (high); correctness Opus and Sol, quality Sonnet (high), on
  Copilot; no fix workers.
- Timing: delivery 87 min (reading 1, 4 unlogged, implementation 19, verification 10,
  reviews and their fixes 50); PR open to merge 29, of which CI on the rebased head 10
  and the rest the owner's answer and the rebase; retro 20 (CI ran the full suite,
  since the retro edited comments in CSS and TypeScript); item total 136.
- Reviews: 6 reviewer tasks. Correctness Opus: round 1 only (P3s). Sol: round 1, a
  final fresh pass (behaviour changed in fixes) and its re-check. Quality: round 1 and a
  re-check. Accepted: P2 ×1 (Sol's final pass: an upward move in a long list was not
  revealed when focus was already on Move), P3 ×2, 🟡 ×1, 💭 ×7. Declined: none.
- Escapes: none.
- Rework: two review-fix heads before the PR; one rebase push after it, with the
  branch's own commits unchanged, so no re-review.
- Recovery: one decision (D7: a pointer's first press during the travel ends it and is
  swallowed) put to the owner twice: first as a non-blocking agent decision during the
  delivery, then again before merge, because review widened it from the travelling
  items to the whole room between the bars. The merge was held until the second
  answer. Head drift: the rebase above.
- Human interventions: 2, both owner answers accepting D7 (narrow form, then wide).
- Bot status at readiness: completed-current on `e781a37`, all checks green.
- Retro:
  [#191](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/191),
  merged as `b968cd2`: an answered decision that later work widens goes back to the
  owner; the code-review async lens names edge-triggered reactions; the UI lens wants
  evidence for a CSS rule that carries behaviour. 4 reviewer tasks (Opus, Sol, Sonnet
  and its re-check): 🟡 ×2, P3 ×2, 💭 ×4, all fixed.
- Evidence limits: no usage units; CI on `0df6dec` before the rebase not retained in
  the PR's rollup.

### STY-075: A Product Lead sees an item's tags together, and still as a row opens

- Type / risk: story; Features/UI layout and E2E; no new copy. Added by the owner
  mid-run, a new scope request, not an intervention.
- PR / assessed head / outcome:
  [#192](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/192),
  `7f862c3` (reviewed `8aa87dd` plus a record-only Delivered commit), merged as
  `19ee362`.
- Models: delivery Sonnet (high); correctness Opus and Sol, quality Sonnet (high), on
  Copilot; no fix workers.
- Timing: delivery 58 min (reading 2, before screenshots 1, implementation and tests
  about 16, first verification 15, reviews and their fixes 20, final gate 15, under a
  host load of 14–20); CI wait 12; retro 10; item total 79.
- Reviews: 5 reviewer tasks. Correctness Opus: round 1 only (P3s). Sol: round 1 and a
  re-check. Quality: round 1 and a re-check. No final fresh pass: no fix changed
  runtime behaviour. Accepted: P2 ×1 (a test race), P3 ×3, 🟡 ×5, 💭 ×4. Declined: 💭
  ×2. Round 1 was dispatched at 16:25, four minutes before the first full E2E run
  finished green on the same head.
- Escapes: none.
- Rework: two review-fix heads before the PR; no pushes after it.
- Recovery: two Vitest timeouts and one E2E flake under host load, each passing alone;
  the gate was waited on by 24 short polling calls (the retro's subject).
- Human interventions: 0.
- Bot status at readiness: completed-current, all checks green.
- Retro:
  [#195](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/195),
  merged as `27b0101`: a test run longer than a foreground command can wait runs in the
  background and the agent yields until it completes. 4 reviewer tasks (Opus and Sol,
  two rounds): P2 ×1 (raised by both), P3 ×3, all fixed.
- Evidence limits: no usage units; reviewer durations not reported.

### STY-073: A Product Lead sees the items travel back when they undo an order

- Type / risk: story; Features/UI and E2E; reuses STY-072's travel; no new copy.
- PR / assessed head / outcome:
  [#197](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/197),
  `2384cbc`, merged as `b00765a`.
- Models: delivery Sonnet (high); correctness Opus and Sol, quality Sonnet (high), on
  Copilot; no fix workers.
- Timing: delivery 51 min (reading 1, implementation 5, verification 11, round 1 11,
  fixes and round 2 1, final gate about 20 with one rerun); gate waits 28 of the 51; CI
  wait 10; retro 23 (including a reproduction of the load timeouts); item total 83.
- Reviews: 4 reviewer tasks. Correctness Opus and Sol: round 1, no findings. Quality:
  round 1 and a re-check. Accepted: 🟡 ×3, 💭 ×4. Declined: 💭 ×1 (a long test title).
- Escapes: none.
- Rework: one review-fix head before the PR; no pushes after it.
- Recovery: the final gate was rerun in full, about 11 min, after two unrelated page
  tests timed out at 5 s under host load 15 and passed alone.
- Human interventions: 0.
- Bot status at readiness: completed-current, all checks green.
- Retro:
  [#199](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/199),
  merged as `2c800ab`: a load flake proven not caused by the change goes on from the
  failed command instead of rerunning the gate, and
  [DEF-022](../../backlog/_archive/defects/DEF-022-page-tests-time-out-when-the-host-is-busy.md)
  records the page tests' timeouts on a busy host (Needs triage). 4 reviewer tasks
  (Opus and Sol, two rounds): P2 ×1 (raised by both), P3 ×7, fixed; two declined.
- Evidence limits: no usage units; reviewer durations not reported.

## Learnings and next evaluation

- What helped: one item at a time, merged before the next began, kept every delivery
  on a fresh base with no stacking; a retro's merge to the next delivery's start took
  about a minute each time. All 37 reviewer tasks ran on Copilot with no usage limit
  and no failed dispatch. No escape reached CI or the PRs.
- Avoidable cost: gate waits dominated the Sonnet deliveries under host load (28 of
  STY-073's 51 min), now addressed by #195 and #199 and recorded as DEF-022. D7 went
  to the owner twice, now addressed by #191. Neither is an orchestration cost.
- Orchestration retro: no-op. The orchestrator sessions reported no friction beyond
  the items' own. The one runtime surprise, Copilot ceasing to accept the `agent` and
  `reasoning_effort` options for Opus and Sol, came in the setup session before the
  queue, failed one dispatch, was absorbed into the run's brief and did not recur. The
  post-PR rebase of #190 followed the existing rule for an unchanged range-diff. The
  15-minute fallback wakes cost only read-only checks.
- Follow-up work, open owner notes:
  - a fluent Welsh read of STY-071's `placedIn` status line, "Gosodwyd o dan
    {{placement}}", where the English says "Placed in";
  - STY-071's declined P2 on #186 (a co-lead's same-placement move during a pending
    reorder) has no backlog record. `docs/AGENTS.md` makes a declined finding whose
    cost the owner may later pay a `Proposed` chore; the delivery recorded none, and
    the handoffs carried it as "consider logging as a defect". The owner decides
    whether to record it;
  - [DEF-022](../../backlog/_archive/defects/DEF-022-page-tests-time-out-when-the-host-is-busy.md)
    awaits triage, and STY-074 its grilling.
- Next comparison: the final fresh pass found P2s after round 2 on both Opus items
  whose fixes changed logic (three on STY-071, one on STY-072), and none ran on the
  Sonnet items, whose fixes were tests and comments. Check on comparable items whether
  the pass keeps finding P2s on logic-changing fixes, and whether a delivery that
  dispatches round 1 before its verification is green (STY-075) ever pays for it.
