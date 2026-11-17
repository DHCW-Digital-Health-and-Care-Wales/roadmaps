# Delivery run: EPC-011 reordering a placement's items

- Run key: 2026-11-16-epc-011-reorder-placement-items
- Captured at (UTC): 2026-11-17T03:40Z
- Started / stopped (UTC): 2026-11-16T23:53Z / 2026-11-17T03:37Z
- Workflow revision: `25079d1` (the STY-051 and STY-050 records). Mid-run, [#129](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/129) (STY-051's retro) changed no delivery guidance.
- Scope and policy: STY-051 then STY-050, in that order (STY-050 depends on STY-051). Merging authorized: the orchestrator babysat each PR to green and squash-merged it pinned to the reviewed head, before the dependant started. Stop after STY-050. The owner asked for Fable 5.2 on both delivery agents; reviewers were Opus and Sol (correctness) and Sonnet at high effort (quality). One orchestrator session per item.
- Outcome: completed. Both items, and both retro PRs, merged; no item blocked. Two owner decisions are open (below).
- Coverage: run log, run handoff, per-item delivery and retro reports, `gh api` for PR times. Token and cost usage were not reported for any session, so every usage figure is unknown. Reviewer durations come from the delivery agents' log lines.

## Items

### STY-051: A moved item goes last in its new placement

- Type / risk: story; writes to the shared data source (the public site's contract), a new `moveDimension` request, a new refusal mapping.
- PR / assessed head / outcome: [#128](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/128), `9be73b6`, merged as `bd435f0`.
- Models: delivery Fable 5.2 (high); correctness Opus and Sol (`gpt-6.1-sol`, high); quality Sonnet (high).
- Timing: dispatch to PR 63 min (implementation 37, review 21); PR to merge 5; retro to merge 20; total 88. CI wait is within the 5.
- Reviews: three reviewer tasks in round 1, a Sonnet re-check and a Sol final fresh pass in round 2. Accepted: Opus P3 x2, Sonnet 2 yellow and 4 nits, Sol none. One P3 was recorded as DEF-017 rather than fixed.
- Escapes: none.
- Rework: one fix commit after round 1, one for two round-2 nits.
- Recovery: none. One Playwright run failed once on a known flake (DEF-016) and passed on rerun.
- Human interventions: 1, the owner's instruction that STY-050 also use Fable 5.2.
- Bot status at readiness: completed-current (CI 3/3 on `9be73b6`).
- Retro: [#129](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/129), merged as `3f309cc`.
- Evidence limits: no token or cost usage reported.

### STY-050: A Product Lead reorders the items in a placement

- Type / risk: story; publish plan and conflict rules, row moves in a tab a co-lead may be editing, a new `insertDimension` request.
- PR / assessed head / outcome: [#130](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/130), `9a67871`, merged as `8be30be`.
- Models: delivery Fable 5.2 (high), the owner's instruction overriding the record's Suggested model (Opus); correctness Opus and Sol; quality Sonnet (high).
- Timing: dispatch to PR 118 min (implementation 60, review round 1 18, fixes 19, round 2 and final pass 5); PR to merge 6; retro to merge 12; total 224 from dispatch.
- Reviews: round 1 had Opus, Sol and Sonnet, plus a second Opus for the test files the first left unread; round 2 had Opus, Sol and Sonnet re-checks and a Sol final fresh pass. Accepted: P2 x2 (Opus and Sol one each), P3 x2 (Opus), Sonnet 2 yellow and 7 nits, then 3 nits on re-check (2 fixed, 1 declined). The first Opus read the 342,827-character diff only in part; the second Opus found one of the P2s.
- Escapes: none.
- Rework: one fix commit after round 1, one for the re-check nits.
- Recovery: none.
- Human interventions: 0.
- Bot status at readiness: completed-current (CI 3/3 on `9a67871`).
- Retro: [#131](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/131), merged as `242f683`; it adds STY-050's measurement to CHO-016.
- Evidence limits: no token or cost usage reported except the reviewer figures the retro quotes.

## Learnings and next evaluation

- What helped or caused avoidable cost: the Fable 5.2 deliveries needed no intervention and no recovery. A first Opus reviewer leaving part of a large diff unread cost one extra reviewer (about 159k tokens, no extra wall time) and caught a P2 there; this is the second occurrence (STY-043 was the first) and is noted in CHO-016. The 15-minute fallback wake fired with nothing to do five times in STY-050's 118 minutes, each time reloading the orchestrate skill.
- Follow-up work: [CHO-016](../../backlog/chores/CHO-016-the-quality-reviewer-reads-the-whole-diff.md) (whether the quality reviewer reads the whole diff; owner decision below), [CHO-019](../../backlog/chores/CHO-019-check-a-published-move-against-a-real-spreadsheet.md) and [CHO-020](../../backlog/chores/CHO-020-check-a-published-order-against-a-real-spreadsheet.md) (check the editor's own requests against a real spreadsheet), DEF-017 (needs triage).
- Owner decisions open: STY-051 D3, D4, D8 and STY-050 D12, and the two ADR-012 wording differences, are in the PR bodies. Whether STY-051 and STY-050 count as the two measured deliveries that settle the Sonnet trial is in #131. The new Welsh needs a fluent read.
- Orchestration retrospective: no-op. No repeatable orchestration cost beyond the idle fallback wakes, which are cheap and cover a real failure mode.
- Next comparison: whether the fallback wake interval should lengthen when a child's log shows it is mid-review; no policy change implied.
