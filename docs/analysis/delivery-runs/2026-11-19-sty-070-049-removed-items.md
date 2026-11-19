# Delivery run: STY-070 then STY-049 (removing a published item)

- Run key: 2026-11-19-sty-070-049-removed-items
- Captured at (UTC): 2026-11-19T04:25Z
- Started / stopped (UTC): 2026-11-19T00:51Z / 2026-11-19T04:20Z (approx.; stop from the last retro report)
- Workflow revision: main at c4e3934 for STY-070; 31fa766 then 10f3ef1 for STY-049
- Scope and policy: STY-070 then STY-049 (hard dependency); merging authorized, each PR babysat to green and squash-merged before the dependant; stop after the queue. Codex Sol was usage-limited, so Sol ran on GitHub Copilot `gpt-6.1-sol`.
- Outcome: completed. Both items merged; both per-item retros were no-ops (the STY-070 orchestration retro PR #176 also merged).
- Coverage: run log, delivery and retro reports, PR pages. Token and cost usage were not exposed by the runtime: unknown. The queue changed orchestrator session once (one handoff); no compaction incident was observed.

## Items

### STY-070: The repository publishes a removed item

- Type / risk: feature, no UI; changes what the editor writes (data-source contract), the all-or-nothing batch write
- PR / assessed head / outcome: [#175](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/175), reviewed head a24e239, merged 31fa766
- Models: delivery Opus 5.5 high; correctness Opus 5.5 and Sol (Copilot `gpt-6.1-sol`); quality Sonnet 5.5 high
- Timing: reading 6, implementation 20, verification 12, review round 1 about 21, round 2 and final pass about 3, PR to merge 9; about 70 minutes from start to PR
- Reviews: 6 reviewer tasks (one Codex Sol failed on its usage limit); 2 rounds; 3 P2 (2 unique), 1 P3, 1 🟡, 7 💭 accepted and fixed; 2 hand-offs declined
- Escapes: none observed (CI green, no human or bot review)
- Rework: fixes pushed after each round; fix workers none
- Recovery: Codex Sol usage limit, rerun on Copilot
- Human interventions: 0
- Bot status at readiness: completed-current
- Retro: no-op for the item; orchestration retro [#176](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/176) merged 10f3ef1
- Evidence limits: no session log for the delivery; no usage figures

### STY-049: A Product Lead removes a published item

- Type / risk: feature, UI (card, compact row, publish dialog, conflict review) plus en/cy copy
- PR / assessed head / outcome: [#177](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/177), reviewed code head 5f35581 (+ one record-only commit, 107a59e), merged dd19400
- Models: delivery Opus 5.5 high; correctness Opus 5.5 and Sol (Copilot); quality Sonnet 5.5 high
- Timing: reading 7, implementation 26, verification 12, review rounds 1 and 2 plus final pass about 43, final-pass fixes and gate 10; PR at 03:39 (about 92 minutes after dispatch); CI wait about 10 minutes
- Reviews: 6 reviewer tasks across a round 1, a re-check and a Sol final pass; accepted 7 P2 (Sol), 1 P3 (Opus), 5 🟡, 4 💭, all fixed; 1 💭 declined
- Escapes: the 2 P2 from the Sol final pass and the one reopened P2 came after the review cap, and were fixed test-first without a further review; none after CI
- Rework: 4 fix commits after reviews; fix workers none
- Recovery: none beyond the Sol provider switch made up front
- Human interventions: 0
- Bot status at readiness: completed-current (5 checks green on 107a59e)
- Retro: no-op; both candidates (removal question pattern, Playwright substring gotcha) were already covered by existing guides
- Evidence limits: no usage figures; DEF-016 flake (1 failure in the full E2E run, 2 of 20 on repeat) was seen in verification, not in CI

## Learnings and next evaluation

- What helped or caused avoidable cost: the Contract for dependents written by STY-070 let STY-049 build without rework of the write. Review was the longest phase in both items (about 25 and 43 minutes); the Sol pass was its critical path. One handoff miss: the run handoff listed the STY-070 retro as pending although the outgoing session had already raised and merged it (#176), so a duplicate retro child ran and found nothing; it cost one agent run.
- Follow-up work: [CHO-025](../../backlog/chores/CHO-025-check-a-published-removal-against-a-real-spreadsheet.md) (check the write on a real spreadsheet); [DEF-019](../../backlog/_archive/defects/DEF-019-the-compact-view-s-axe-check-fails-now-and-then-on-target-size.md) (flaky axe check); DEF-016 (flaky focus tour), already recorded; a fluent Welsh read of STY-049's new strings is owed by the owner.
- Next comparison: whether review-cap exemptions (fixes after the cap, test-first) keep catching late P2s on comparable UI items.
