# Delivery run: Backlog triage mop-up

- Run key: 2026-11-15-backlog-triage-mop-up
- Captured at (UTC): 2026-11-15T17:23Z
- Started / stopped (UTC): 2026-11-15T13:29Z / 2026-11-15T17:21Z
- Workflow revision: `4ff0fb0` (PR #95, the triage records). Mid-run merges changed no delivery guidance: #98 added a defect record, and #96, outside the queue, added two skills the run did not use.
- Scope and policy: the defects and chores the owner triaged in [#95](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/95), in order: DEF-009, DEF-010, a UI batch (DEF-002, DEF-005, DEF-007, DEF-008), CHO-004, and a test batch (CHO-012, CHO-013). DEF-004 was closed Won't fix before the run. Merging authorized: each item and its retro PR babysat to green and squash-merged before the next started; the orchestration retro PR stays open. One top-level orchestrator session per item (GitHub Copilot `claude-sonnet-5.5`, medium) handing off to the next. Delivery agents on the record's Suggested model (`claudeAgent`); correctness by Opus and Sol (`gpt-6.1-sol` on GitHub Copilot), quality by Sonnet at effort high (the CHO-016 trial). New defects recorded Needs triage, never fixed. Stop after the queue.
- Outcome: completed. All five items and the one retro PR merged; no item blocked.
- Coverage: run log, run handoff, per-item delivery, retro and orchestrator reports, `gh pr view`. Token and cost usage were not reported for any session (orchestrators, delivery agents, reviewers), so every usage figure is unknown. Reviewer durations were not exposed beyond item B. The orchestrator sessions' handoff times differ from the run log by up to about 7 minutes for items F and G; the log is used.

## Items

### DEF-009: A new item that was published is not shown when the read after it fails

- Type / risk: defect; publishing state (pending edits after a confirmed publish), ADR-012.
- PR / assessed head / outcome: [#97](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/97), `7d6cd0408f27be9ed3ab172705f74e42f75bae4d` (code reviewed at `1cd3b14`, then a record-only commit), merged as `10f5295470780bf491b483376c40dd08f5c9f79c`.
- Models: delivery Opus 5.5 medium; correctness Opus 5.5 medium and Sol high; quality Sonnet 5.5 high; retro Sonnet 5.5.
- Timing: delivery 13:30–14:20Z (50 min): reading 7, implementation tests-first 4, verification 8, review rounds and fixes about 33. CI wait 5 (PR to merge). Retro 14:25–14:37Z (12, including its own PR and merge). Total about 67 min.
- Reviews: 6 reviewer tasks. Round 1: Opus, Sol, Sonnet. Round 2: Sol re-check, Sonnet re-check, Sol final fresh pass. Accepted: P2 3 (one also raised by Opus as P3; one after the cap, fixed red-first), quality 🟡 4 (one closed by recording DEF-011 and DEF-012), 💭 3. Declined: P2 1 (recorded as DEF-011), 💭 1.
- Escapes: none. CI green first time on the head; no bot or human findings.
- Rework: no fix workers; fixes by the delivery agent. Fix pushes unknown (pushed once with the PR).
- Recovery: none.
- Human interventions: 1. The owner prompted the item B orchestrator to set the fallback wake it had skipped.
- Bot status at readiness: completed-current (CI green on `7d6cd04`).
- Retro: [#98](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/98), merged as `7d31a997e140456149cb477f3767e33f42cd81ca`. It recorded #95's CI focus-test flake as DEF-013. Reviewed by Opus and Sol, then a clean Sol re-check: accepted Low 3, P3 1, nit 1.
- Evidence limits: usage unknown; the CHO-016 trial did not apply (diff about 40,000 characters).

### DEF-010: A dialog that publishes changes what it shows once written

- Type / risk: defect; publishing dialog state, ADR-012.
- PR / assessed head / outcome: [#99](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/99), `bccac00ab9fe34efb2ac2165bf52ac63266c1021`, merged as `dc492a5cc213456d77869d896195724f9ded58dd`.
- Models: delivery Sonnet 5.5 medium; correctness Opus 5.5 medium and Sol high; quality Sonnet 5.5 high.
- Timing: delivery 14:37–15:10Z (32 min): implementation 2, verification 3, review rounds and fixes about 23. CI wait 5. Retro under 1. Total about 39 min.
- Reviews: 4 reviewer tasks. Round 1: Opus (no findings), Sol, Sonnet. Round 2: Sol final fresh pass. Accepted: P1 1 (a roadmap-to-roadmap navigation kept the dialog's state; fixed with a regression test), 💭 4. Sol's round-2 P2 was pre-existing and recorded as DEF-014. Declined: 0.
- Escapes: none.
- Rework: no fix workers; one rebase onto `c4ee9a5` before the PR.
- Recovery: none.
- Human interventions: 0.
- Bot status at readiness: completed-current.
- Retro: no-op; the one cross-roadmap miss has its record in DEF-014 and does not yet recur.
- Evidence limits: usage and reviewer durations unknown. No screenshots: the changed state is transient, and page tests check each step.

### UI mop-up: DEF-002, DEF-005, DEF-007, DEF-008

- Type / risk: four Low defects in one PR (header home link name on phones, About form family after Refresh, status panel corners, focus after "Add a roadmap" closes in Safari); visible UI and Welsh copy.
- PR / assessed head / outcome: [#100](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/100), `47cda591e2098b36ab331d42449d7a453b401ef7` (code gated at `008a562`, then record links), merged as `75a74a4f32dc1d789078139b085520eecfa3d3af`.
- Models: delivery Sonnet 5.5 medium; correctness Opus 5.5 medium and Sol high; quality Sonnet 5.5 high.
- Timing: delivery 15:16–15:57Z (41 min): implementation with before screenshots 13, verification 6, review rounds and fixes about 21. CI wait 5. Retro under 5. Total about 49 min.
- Reviews: 4 reviewer tasks. Round 1: Opus, Sol, Sonnet. Then a Sol final fresh pass. Accepted: P3 2 (the opener race, raised by Opus and Sol; the lazy opener from the final pass, fixed after the cap), quality 🟡 1, nits 3. Opus's P3 on Welsh word order kept the build and became an owner question (DEF-002 Decisions).
- Escapes: none.
- Rework: no fix workers.
- Recovery: none.
- Human interventions: 0.
- Bot status at readiness: completed-current.
- Retro: no-op; each finding followed the written process.
- Evidence limits: usage and reviewer durations unknown. Before/after screenshots are in #100. Not run: base-path E2E, Safari.

### CHO-004: Share the write-failure copy

- Type / risk: chore; copy keys only (English and Welsh), no wording change.
- PR / assessed head / outcome: [#101](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/101), `b423811a0e8d627e6cbe414ea7035c29d1347e15` (code reviewed at `00fc726`, then fixes and the record link), merged as `0e07b355098426455b0a380531ce47dfedcce107`.
- Models: delivery Sonnet 5.5 medium; correctness Opus 5.5 medium and Sol high; quality Sonnet 5.5 high.
- Timing: delivery 16:03–16:21Z (18 min): implementation 4, verification 5, review 8. CI wait 12. Retro under 7. Total about 37 min.
- Reviews: 3 reviewer tasks, round 1 only (P3 and 💭 findings need no re-check). Accepted: P3 1 (a stale STY-041 link, raised by all three lanes), 💭 1. Declined: 💭 1 (cosmetic naming).
- Escapes: none.
- Rework: no fix workers. E2E was not re-run after the docs and import-order fix.
- Recovery: none. The delivery agent yielded twice before its final hand-back, as delegation.md describes.
- Human interventions: 0.
- Bot status at readiness: completed-current.
- Retro: no-op.
- Evidence limits: usage and reviewer durations unknown.

### Test tidy-up: CHO-012, CHO-013

- Type / risk: chores; test files only (shared fixtures and connected state; a page focus tour that tells its stops apart).
- PR / assessed head / outcome: [#110](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/110), `3dfa8b977d2e9a9bc16227eb0c283f8236bcb4ab`, merged as `59598cb1e7b581467733cbc14046bc2234015d5a`.
- Models: delivery Sonnet 5.5 medium; correctness Opus 5.5 medium and Sol high; quality Sonnet 5.5 high.
- Timing: delivery 16:34–17:15Z (41 min): CHO-013's tours re-measured first, implementation 16, verification 6, review rounds and fixes about 18. CI wait 7. Retro under 1. Total about 47 min.
- Reviews: 4 reviewer tasks. Round 1: Opus, Sol, Sonnet. Round 2: Sol re-check, clean. Accepted: P2 1 (the tour hid a selected details field; fixed with a new outline check), P3 1, 💭 2. Declined: 💭 1.
- Escapes: none.
- Rework: no fix workers.
- Recovery: 1 cancelled dispatch. The first delivery agent started on the wrong provider (GitHub Copilot) because the provider and model were passed outside the delegation tool's `target`; it was cancelled and redispatched on `claudeAgent`. Delay unknown (minutes). One STY-044 E2E flake in 17 local runs was not reproduced and not recorded.
- Human interventions: unknown; the reports do not say who caught the wrong provider.
- Bot status at readiness: completed-current.
- Retro: no-op; the tour's new guard and the `tests/e2e/AGENTS.md` bullet already hold the lesson.
- Evidence limits: usage and reviewer durations unknown. No orchestrator report for this item; the run handoff records its dispatch.

## Learnings and next evaluation

- What helped or caused avoidable cost: every PR passed CI first time and merged 5–12 minutes after it was raised. Sol raised the only P1 (DEF-010) and every P2. Opus's and Sonnet's findings overlapped Sol's or were P3 and below. Each orchestrator session handed off to the next with no lost state. Avoidable costs: one skipped fallback wake (item B, set once the owner prompted it), one wrong-provider dispatch (item G), and an unexpanded `$(date)` left in two item handoffs (cosmetic).
- Orchestration retro: no-op. The fallback wake is already a written step that later sessions followed. The wrong-provider dispatch came from one tool's input shape, happened once and was caught before work landed; orchestrate step 2 already asks the orchestrator to check the delegation tool's providers and models. The `$(date)` text was in run-local scratch files. None recurs enough to earn a guidance line.
- Follow-up work: [DEF-011](../../backlog/defects/DEF-011-an-edit-back-to-the-text-last-read-is-dropped-before-a-read-holds-a-publish.md), [DEF-012](../../backlog/defects/DEF-012-an-item-without-an-id-edited-again-before-a-read-is-reported-changed.md), [DEF-013](../../backlog/defects/DEF-013-a-test-checks-the-roadmap-dialog-s-opening-focus-before-it-moves.md) and [DEF-014](../../backlog/defects/DEF-014-publish-roadmap-carries-its-dialog-and-outcome-to-another-roadmap.md), all Needs triage. Owner question: the Welsh home-link word order in DEF-002's Decisions.
- Next comparison: whether Sol keeps raising the only P1 and P2 findings on defect items, and whether the delegation tool's provider check catches a wrong-provider dispatch before work starts.
