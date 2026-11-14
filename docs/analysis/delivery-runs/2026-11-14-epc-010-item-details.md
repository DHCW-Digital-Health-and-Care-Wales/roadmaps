# Delivery run: EPC-010 Item details

- Run key: 2026-11-14-epc-010-item-details
- Captured at (UTC): 2026-11-14T11:10Z
- Started / stopped (UTC): 2026-11-14T09:02Z / 2026-11-14T11:10Z
- Workflow revision: `8bdef62` (PR #70 amends validation.md after this run)
- Scope and policy: STY-039 only, stop after it. Delivery agent on Fable 5.2 (named by the owner); reviews in the delegation lanes. The delivery and retro PRs are left open; no babysitting or merging.
- Outcome: completed. Both PRs open for the owner.
- Coverage: run log, delivery and retro reports, PR bodies. Cost and tokens are reported for the Claude reviewers only; Codex and GitHub Copilot sessions report none.

## Items

### STY-039: A Product Lead edits an item's details

- Type / risk: story; changes the shared data source contract (`Details` cell), new form control, Welsh-detail hazard.
- PR / assessed head / outcome: [#69](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/69), `7f6670de34ba85e5466fe9b0d365849fb3443579`, left open. CI was running at capture.
- Models: delivery Fable 5.2; correctness Opus and `gpt-6.1-sol` (Codex, then GitHub Copilot); quality Sonnet; retro Opus.
- Timing: delivery 09:17–10:57Z (100 min): reading 5, implementation 43, review rounds and fixes about 50. Retro about 10 min after hand-back. Total about 125 min with orchestration.
- Reviews: 8 reviewer tasks (one Codex Sol task failed on a usage limit and produced no review). Correctness had round 1, a re-check, a final fresh pass and its re-check. Quality had round 1 and one re-check. Accepted findings: P0 0, P1 0, P2 6, P3 2, quality 🟡 3, all fixed; 2 💭 declined.
- Escapes: one P2 found after the cap and fixed (`ed33a3d`) with no review of its own. No CI, bot or human escapes known at capture.
- Rework: no fix workers; fixes by the delivery agent in two rounds plus one after-cap fix.
- Recovery: one usage limit (Codex Sol), rerun on GitHub Copilot with the same brief.
- Human interventions: 0.
- Bot status at readiness: not babysat.
- Retro: [#70](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/70), one paragraph in `validation.md`; the targeted checks, not the full gate, precede a re-check. Open.
- Evidence limits: no cost for Codex or Copilot sessions; orchestrator usage not exposed.

## Learnings and next evaluation

- What helped or caused avoidable cost: the full gate (about 3m50s) ran before each review round, delaying reviews by about 7.6 minutes in total (addressed by #70). The Sol fallback to GitHub Copilot cost one failed task and little time.
- Follow-up work: none beyond #70.
- Orchestration retro: no-op; no repeatable orchestration friction.
- Next comparison: whether #70 shortens the time between fixes and re-checks.
