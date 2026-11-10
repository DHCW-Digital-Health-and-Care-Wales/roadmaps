# Delivery run: EPC-002 roadmap list from the roadmap index

- Run key: 2026-11-10-epc-002-roadmap-list
- Captured at (UTC): 2026-11-10T15:40Z
- Started / stopped (UTC): 2026-11-10T13:14Z / 2026-11-10T15:40Z
- Workflow revision: 16632d3 at the start. Mid-run changes: 41a9270 (STY-011's retro,
  `screenshots.md`) was on `main` before STY-012 started.
- Scope and policy: STY-010, STY-011 and STY-012 in dependency order. Merging was not
  authorized: every PR was left open, and the owner merged each prerequisite before its
  dependant started. Stop after the queue.
- Outcome: completed. STY-010 and STY-011 merged (owner); STY-012 PR open for review.
  Per-item retros: STY-010 no-op, STY-011 merged, STY-012 open.
- Coverage: the run's progress log, child handoffs and reports, PR state on GitHub.
  Usage covers only reviewer token counts that child reports quoted; delegated delivery
  and retro sessions, and every Codex (Sol) session, reported no usage or cost, so
  usage is unknown for the run.

## Items

### STY-010 A roadmap carries its list information, and the roadmap index can be parsed

- Type / risk: story; domain port change and untrusted-data parser.
- PR / assessed head / outcome: [#4](https://github.com/collisdigital/roadmaps-editor/pull/4),
  ee005ab, merged by the owner as 1ebb643.
- Models: delivery Opus (high, escalated from the record's tier for the parser);
  correctness Opus and Sol (`gpt-6.1-sol`, high); quality Sonnet.
- Timing: delivery 24 min (13:15–13:39), round-1 reviews 5 min; retro 1 min.
- Reviews: 3 reviewer tasks, one round each; accepted findings: 3 quality nits; declined 0.
- Escapes: none observed.
- Rework: no fix workers; fixes pushed by the delivery agent before the PR.
- Recovery: none.
- Human interventions: 0.
- Bot status at readiness: not babysat.
- Retro: no-op, with evidence.
- Evidence limits: usage unknown.

### STY-011 The roadmap list shows the roadmaps the public site lists

- Type / risk: story; repository adapter and untrusted Sheets data.
- PR / assessed head / outcome: [#5](https://github.com/collisdigital/roadmaps-editor/pull/5),
  b0c21be, merged by the owner as 06e0f09.
- Models: delivery Opus (high, escalated from Suggested Sonnet for the adapter); reviews
  as STY-010.
- Timing: delivery 23 min (13:46–14:09), round-1 reviews 3 min; retro 6 min to its PR.
- Reviews: 3 reviewer tasks, one round each; accepted: 3 quality nits and one README
  hand-off from Opus; declined 0.
- Escapes: none observed.
- Rework: none beyond pre-PR fixes.
- Recovery: none.
- Human interventions: 1. The owner corrected the orchestrator for not starting a new
  top-level thread per item (see Learnings).
- Bot status at readiness: not babysat.
- Retro: [#6](https://github.com/collisdigital/roadmaps-editor/pull/6), merged as 41a9270.
  Docs only; Opus round 1 (P2, P3) and re-check (P3), Sol round 1 (P2) and re-check; all
  fixed.
- Evidence limits: usage unknown.

### STY-012 Roadmap cards show each roadmap's information, grouped by product family

- Type / risk: story; presentation, copy (en + cy), accessibility.
- PR / assessed head / outcome: [#7](https://github.com/collisdigital/roadmaps-editor/pull/7),
  8cf1316 (reviewed cbcbac4, then a record-only commit), open for the owner; CI passed.
- Models: delivery Sonnet (high, the record's tier); reviews as STY-010.
- Timing: delivery 37 min (14:47–15:24), reviews about 12 min including re-checks;
  retro 5 min to its PR.
- Reviews: 6 reviewer tasks. Opus round 1 (P3); Sol round 1 (P2: long text overflowed
  the card at 375 px), re-check and a final fresh pass, both clean; Sonnet round 1
  (2 🟡, 5 💭), re-check clean. All accepted; declined 0.
- Escapes: none observed. The Codex GitHub bot finished at cbcbac4 with no findings.
- Rework: none beyond pre-PR fixes.
- Recovery: none.
- Human interventions: 0.
- Bot status at readiness: completed-old-head (cbcbac4; the later commit only links the PR).
- Retro: [#8](https://github.com/collisdigital/roadmaps-editor/pull/8), open. Adds one
  E2E rule (wait for a request's own effect before asserting a fake's request log).
  Opus round 1 (3 P3) and re-check clean; Sol round 1 clean.
- Evidence limits: usage unknown.

## Learnings and next evaluation

- Helped: briefs built from one shared run brief plus a short per-item brief; owner
  merges between items kept every item on a fresh `main`, with no stacking.
- Avoidable cost: the per-item session handoff was skipped for STY-011, because a
  runtime rule ("new top-level threads only when the user asks") was read as overriding
  the orchestrate skill. The owner treats the orchestrate request as that ask; this
  record's PR says so in the root `AGENTS.md`. STY-012 ran in its own thread.
- Minor, not changed: one retro brief cloned by text substitution kept the previous
  item's lowercase branch name; the shared brief named one model in the commit trailer
  although the trailer follows the model that runs (`brief.md` already says so); a retro
  review brief asked reviewers for a merge check that writes objects, which the
  read-only reviewer rule forbids. Each happened once.
- Follow-up work: STY-012's deferrals in its retro (a `grid-cols-1` comment after #7
  merges); fluent Welsh review of the new copy.
- Next comparison: delivery time and review findings for presentation stories on
  Sonnet against adapter stories on Opus.
