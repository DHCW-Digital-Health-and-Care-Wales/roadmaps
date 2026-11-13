# Delivery run: EPC-004 roadmap items (STY-019 to STY-021)

- Run key: 2026-11-11-epc-004-roadmap-items
- Captured at (UTC): 2026-11-11T03:00Z
- Started / stopped (UTC): 2026-11-11T01:37Z / 2026-11-11T03:00Z
- Workflow revision: 34241ff (main at start; no instruction changes during the run)
- Scope and policy: STY-019, STY-020, STY-021 in strict sequence; merging authorised (orchestrator babysat and squash-merged each PR before the next item); a retro after each item; Opus delivery children, Opus and Sol correctness reviews, Sonnet quality reviews; Sonnet 5.5 (medium) orchestrator, in one session for the whole queue.
- Outcome: completed. All three stories merged; all three retros were no-ops. Pending: the owner triages DEF-002 and arranges the fluent Welsh review.
- Coverage: orchestrator progress log and delivery reports for timings; GitHub for PR state. Token and cost usage were not reported by the runtime, so they are `unknown`. Observed compactions: none exposed.

## Items

### STY-019 Roadmap item model and roadmap tab parser

- Type / risk: story; untrusted-data parsing in the infrastructure adapter
- PR / assessed head / outcome: [#23](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/23), head baf9243, merged as ab7b44c
- Models: Opus delivery; Opus and Sol correctness; Sonnet quality
- Timing: about 27 min from dispatch to PR (01:37 to 02:04Z), including about 12 min recovering from an OOM kill; merged 02:07Z, retro done 02:08Z. About 30 min in total.
- Reviews: one round per lane, Sonnet three nits (fixed). Opus and Sol found nothing. Reviewer task counts and declined findings: unknown for the first child (killed before its report).
- Escapes: none observed
- Rework: one nit-fix push; Opus re-run on the fixed head
- Recovery: the first delivery child was killed by a host out-of-memory condition at review round 1 (Sol and Sonnet done, Opus pending); a fresh Opus child resumed from its handoff. The shared brief now limits reviewers to one at a time and unit tests to `--maxWorkers=2`.
- Human interventions: 0
- Bot status at readiness: not recorded
- Retro: no-op (the OOM was a one-off host condition)
- Evidence limits: first child's usage and task counts lost with the kill

### STY-020 The repository reads a roadmap's items from the tab its index row names

- Type / risk: story; repository port change, untrusted-data parsing
- PR / assessed head / outcome: [#24](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/24), head f3d417c, merged as 7c8d4c0
- Models: Opus delivery; Opus and Sol correctness; Sonnet quality
- Timing: about 16 min from dispatch to PR (02:09 to 02:24Z): implementation about 9, reviews about 5. About 1 min of merge wait after CI. Retro finished by about 02:30Z.
- Reviews: three reviewer tasks plus one Sonnet re-check; Opus 0 and Sol 0 findings; Sonnet 2 medium and 3 minor, all fixed; Opus's two notes: one fixed, one declined (pre-existing STY-011 behaviour)
- Escapes: none (the Codex bot review of the head found nothing)
- Rework: one fix push (64aafef)
- Recovery: none
- Human interventions: 0
- Bot status at readiness: completed-current
- Retro: no-op
- Evidence limits: usage unknown

### STY-021 A roadmap's page shows its items under Now, Next, Later and the other sections

- Type / risk: story; visible UI, new English and Welsh copy, E2E
- PR / assessed head / outcome: [#25](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/25), head d20f6bc, merged as 8479405
- Models: Opus delivery; Opus and Sol correctness; Sonnet quality
- Timing: about 28 min from dispatch to PR (02:28 to 02:57Z): implementation and verification about 17, reviews about 12. Merged after CI passed.
- Reviews: Opus 0, Sol 0 (plus a final fresh whole-diff pass, 0), Sonnet 2 medium and 2 minor, all fixed; one further nit fixed after the re-check; Opus's two notes: one fixed, one declined (wording in the record's own decision)
- Escapes: none (the Codex bot review of the head found nothing)
- Rework: two fix pushes (7037e7c, a6b1614)
- Recovery: none
- Human interventions: 0
- Bot status at readiness: completed-current
- Retro: no-op
- Evidence limits: usage unknown. New backlog item: DEF-002 (Needs triage), a pre-existing accessibility fault found at phone width.

## Learnings and next evaluation

- What helped or caused avoidable cost: sequential reviewers and `--maxWorkers=2` kept memory in bounds after the STY-019 OOM; no later item was killed. Reviews were fast and found nothing in the correctness lanes on all three items, so Sonnet's quality lane caught every accepted finding.
- Follow-up work: DEF-002 (triage); fluent Welsh review of the copy added by STY-011, STY-012, STY-016, STY-017 and STY-021.
- Next comparison: whether Opus and Sol keep finding nothing on comparable items, and whether sequential reviewing stays at about 5 to 12 min. No policy change is implied.
