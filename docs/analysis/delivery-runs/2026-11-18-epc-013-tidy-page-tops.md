# Delivery run: EPC-013 Tidy page tops

- Run key: 2026-11-18-epc-013-tidy-page-tops
- Captured at (UTC): 2026-11-18T13:30Z
- Started / stopped (UTC): 2026-11-18T09:06Z (STY-058 reading) / 2026-11-18T13:22Z (STY-060 retro), about 4 h 16 min.
- Workflow revision: f46384c at the start; no instruction changes merged during the run.
- Scope and policy:
  - Queue: STY-058, STY-059, STY-060 (STY-060 depends on STY-059).
  - Merge: authorized by the owner after STY-058 was dispatched; the top-level orchestrator babysat each PR to green and squash-merged it before the next item started. Per-item retro PRs would be left open; none was needed. This record's PR is left open.
  - Owner note during the run: the machine was under heavy load, so children ran one heavy command at a time and reviewers ran in sequence.
  - Sessions and models: one top-level orchestrator thread per item (Sonnet 5.5, medium effort). Delivery on Sonnet 5.5 for STY-058 and Opus 5.5 at high effort for STY-059 and STY-060, by each record's Suggested model. Correctness lane Opus and Sol; quality lane Sonnet at high effort. Retros Sonnet 5.5 at high effort.
- Outcome: completed. All three stories merged; the three per-item retros were no-ops.
- Coverage: run log, delivery and retro reports and PR state. Tokens are known only where a reviewer's completion reported them; cost was not reported, and no session usage was read.

## Items

### STY-058 — Tidy the roadmap list

- Type / risk: story; UI, i18n.
- PR / assessed head / outcome: [#151](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/151) at d73960d, merged as 5b51244.
- Models: delivery Sonnet 5.5; reviewers Opus, Sol, Sonnet (with a Sonnet re-check).
- Timing: about 100 min to the PR; merge 8 min after hand-back; CI wait not separately captured.
- Reviews: three lanes, one Sonnet re-check; 1 🟡 and 3 💭 accepted and fixed.
- Escapes: 0 observed. Rework: 0 fix pushes after the PR. Recovery: interim yields only.
- Human interventions: 1 (the merge authorization, a policy change). Bot status at readiness: not recorded.
- Retro: no-op; DEF-016 already records the flaky focus-indicator tour.
- Evidence limits: cost not reported.

### STY-059 — A Product Lead opens a roadmap on one header block

- Type / risk: story; UI, i18n, focus and sticky behaviour.
- PR / assessed head / outcome: [#156](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/156) at 6ca13d2, merged as 96bc5af.
- Models: delivery Opus 5.5 (high); Opus, Sol and Sonnet reviewers.
- Timing: about 110 min (09:56–11:46Z) to the PR; merge 7 min after hand-back; CI Verify about 4 min and E2E about 6 min.
- Reviews: Opus 7 min 43 s, Sol about 2.5 min (clean), Sonnet 2 min 30 s plus a 1 min re-check. Accepted: Opus 2 P3; Sonnet 3 🟡 and 6 💭, then 1 🟡 and 4 💭; 2 💭 declined.
- Escapes: 0 observed. Rework: 0 fix pushes after the PR. Recovery: port 4173 held by another worktree, fixed by #154; the branch was rebased onto it.
- Human interventions: 0. Bot status at readiness: not recorded.
- Retro: no-op.
- Evidence limits: cost not reported.

### STY-060 — A Product Lead keeps one row of controls, at the top and once scrolled

- Type / risk: story; UI, i18n (en and cy), sticky strip across three widths.
- PR / assessed head / outcome: [#158](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/158) at 068e20f, merged as 14e181a.
- Models: delivery Opus 5.5 (high); Opus, Sol and Sonnet reviewers.
- Timing: 76 min to the PR (11:55–13:11Z); two full gates of 12 and 10 min; reviews about 22 min in sequence; merge 10 min after hand-back, with all 3 checks green.
- Reviews: Opus 1 P2 (header grid could widen past a phone), fixed and re-checked clean; Sol no findings; Sonnet 2 🟡 and 5 💭, 1 💭 declined, with a re-check of 7/7 and 2 new nits (1 fixed, 1 declined).
- Escapes: 0. Rework: 0 fix pushes after the PR. Recovery: one rebase onto #157 after review (range-diff unchanged).
- Human interventions: 0. Bot status at readiness: all 3 checks passed.
- Retro: no-op.
- Evidence limits: cost not reported; reviewer tokens in the run log only.

## Learnings and next evaluation

- Delivery children yield several times with interim "completed" notifications; only the message ending `PR <url>, head <SHA>` is the hand-back. No wake-up was needed, since each completion arrived.
- The children's commits carry their own model's trailer, not the brief's Sonnet line. `orchestrate/references/brief.md` tells children to follow the session's trailer rule, so the brief text and the skill conflict; the brief should say which wins.
- Sequential reviewers under load cost about 22 min per item against a few minutes for any one lane.
- Follow-up work: none new. DEF-016 stays with the owner to schedule.
- Next comparison: whether sequential review on a loaded machine stays worth it against its added wall time.
