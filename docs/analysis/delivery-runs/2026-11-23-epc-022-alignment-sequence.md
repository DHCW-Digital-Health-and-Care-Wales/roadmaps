# Delivery run: EPC-022 alignment sequence

- Run key: 2026-11-23-epc-022-alignment-sequence
- Captured at (UTC): 2026-11-23T17:40Z
- Started / stopped (UTC): 2026-11-23T11:29Z / 2026-11-23T17:23Z (STY-098's retro PR opened; the queue stopped at STY-099)
- Workflow revision: `main` at `1da20085` for the orchestrate and implement-story skills, unchanged through the run. Per-item retros merged mid-run changed the review skills' reading lists ([#270](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/270), STY-095's, in force from CHO-044's review), the grilling skill and EPC-022's delivery notes ([#274](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/274), STY-096's, in force from STY-097) and the public site's guide ([#276](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/276), STY-097's, in force from STY-098).
- Scope and policy: STY-095, CHO-044, STY-096, STY-097 and STY-098 strictly in order, each merged before the next started, then stop at the STY-099 placeholder. Merging authorised (squash, head-pinned, per `pr-watch.md`), except a PR that changes what the public site shows: STY-096 and STY-097 waited for the owner's explicit approval after before/after screenshots. Per-item retro PRs left open, not babysat. A fresh top-level orchestrator session per item, Sonnet 5.5 medium (owner, 2026-11-23).
- Outcome: stopped as planned. All five primary PRs merged. Retro PRs #270, #274 and #276 were merged by the owner; [#281](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/281) (STY-098's retro) is open; CHO-044's retro was a no-op. STY-099 is a Placeholder that needs design input (a grilling session, then UX prototypes) before it can be promoted and delivered.
- Coverage: the run's progress log, per-item delivery and retro reports, the outgoing orchestrators' evidence reports and GitHub PR data. Stage times come from the log clock; where a report and the log disagree the log and GitHub win. No session reported tokens or cost: usage is unknown for every Claude and Codex session. No compaction was observed or reported.

## Items

### STY-095 The public site adopts the workspace's code conventions

- Type / risk: story, refactor across 138 files (kebab-case renames, shared ESLint and TypeScript bases); merge gated on the public site's built output staying unchanged
- PR / assessed head / outcome: [#269](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/269), `22051464`, merged `1589af15`
- Models: Opus 5.5 high delivery, with two Sonnet 5.5 mechanical workers for lint and type fixes; Opus 5.5 and Sol (gpt-6.1-sol high) correctness; Sonnet 5.5 high quality
- Timing: dispatch to PR 50 min (review rounds 23 min); CI wait 9 min; retro 4 min; about 65 min in all
- Reviews: 4 reviewer tasks; correctness 1 round, quality 2 rounds; 🟡 x1, 💭 x3 and 2 handed-off points fixed; none declined
- Escapes: none observed
- Rework: no fix workers; no push after the PR opened
- Recovery: none; three fallback wakes found the child progressing
- Human interventions: 0
- Bot status at readiness: completed-current
- Retro: [#270](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/270), merged by the owner (`a9d6afbe`)
- Evidence limits: usage unknown

### CHO-044 One dev-ports resolver serves both apps

- Type / risk: chore, workspace tooling; no public-site change (build byte-identical)
- PR / assessed head / outcome: [#272](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/272), `5822e603`, merged `68b032a3`
- Models: Sonnet 5.5 high delivery; Opus 5.5 and Sol correctness; Sonnet 5.5 high quality
- Timing: delivery session 19 min (review round 11 min, Sol on the critical path); CI wait 8 min; retro about 2 min; about 29 min in all
- Reviews: 3 reviewer tasks, 1 round; 🟡 x1 and 💭 x1 fixed (comment-only, no re-check)
- Escapes: none observed
- Rework: none
- Recovery: rebased onto `a9d6afbe` before the PR opened, after the owner merged #270 mid-review (Markdown only, range-diff unchanged, no re-review)
- Human interventions: 0
- Bot status at readiness: completed-current
- Retro: no-op; the friction found was one-off or already covered
- Evidence limits: usage unknown

### STY-096 The public site's interface text moves to typed catalogues

- Type / risk: story, public-site visible (one Welsh count changes); merge held for the owner; Welsh plural forms flagged for a Welsh check
- PR / assessed head / outcome: [#273](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/273), `2602c922`, merged `beb99a96` by the owner
- Models: Opus 5.5 high delivery and Opus 5.5 high rework; Opus 5.5 and Sol correctness; Sonnet 5.5 high quality
- Timing: first delivery to PR 35 min; owner question asked about 13:20Z, decided about 14:16Z (about 56 min waiting on the owner); rework 33 min to push; held for the owner's approval 16 min, then merged; retro about 3 min; about 128 min in all
- Reviews: 10 reviewer tasks across the delivery and the rework, including two fresh passes over lines a first reviewer left unread; 2 rounds each time; P3 x3, 🟡 x4, 💭 x11 fixed; 1 💭 declined
- Escapes: none observed
- Rework: one rework push after the owner's decision (a scope change, not a fix)
- Recovery: the first build added i18next and the site's script crossed its 100 KB Lighthouse budget (119,371 B); the delivery raised it as an owner question rather than raise the budget, and a fresh rework child rebuilt without the library (97,605 B)
- Human interventions: 1 (the owner's decision D10: no i18next on the public site, typed catalogues read by `useStrings()`). The owner deferred the Welsh check of "2 drywydd", "3 thrywydd" and "6 thrywydd" to later.
- Bot status at readiness: completed-current
- Retro: [#274](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/274), merged by the owner (`bb9c96a5`)
- Evidence limits: usage unknown; the owner-question times are from the orchestrator's report, not the log

### STY-097 One version per shared dependency, one font and Node 26

- Type / risk: story, dependency catalogue and font change; public-site visible (font); merge held for the owner
- PR / assessed head / outcome: [#275](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/275), `be0576cd`, merged `ce5027d3` after the owner approved
- Models: Sonnet 5.5 high delivery; Opus 5.5 and Sol correctness; Sonnet 5.5 high quality
- Timing: delivery session 35 min (review rounds 11 min); held for the owner's approval 15 min; retro about 4 min; about 53 min in all
- Reviews: 5 reviewer tasks; correctness and quality 2 rounds (Opus P3 only, no re-check); P1 x1 (an incidental guide edit, also 🔴 from quality), 🟡 x2, P3 and 💭 x4 fixed
- Escapes: none observed
- Rework: none after the PR opened
- Recovery: the host runs Node 22 against the new Node 26 floor; the child downloaded Node 26 once (about 2 min)
- Human interventions: 0 (the approval was the policy's gate)
- Bot status at readiness: completed-current
- Retro: [#276](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/276), merged by the owner (`63ff97a4`)
- Evidence limits: usage unknown

### STY-098 The editor marks English shown in place of Welsh

- Type / risk: story, editor UI across 56 files; public-site output unchanged (byte-identical), so merged as authorised
- PR / assessed head / outcome: [#279](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/279), reviewed `a3ce6ca0`, rebased to `a7e92a9f`, merged `e97a902b`
- Models: Opus 5.5 high delivery; Opus 5.5 and Sol correctness; Sonnet 5.5 high quality
- Timing: dispatch to PR 51 min (review rounds 21 min); CI wait and rebase 18 min; retro about 6 min; about 74 min in all
- Reviews: 6 reviewer tasks; correctness 2 rounds and a Sol final fresh pass, quality 2 rounds; P2 x1, P3 x3, 🟡 x3, 💭 x6 fixed; 1 💭 declined, 1 handed-off point kept with its reason
- Escapes: none observed
- Rework: one forced push (the rebase); no fix push
- Recovery: head drift: the owner's backlog PR [#280](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/280) merged during CI and conflicted on the epic README; resolved by rebase in about 3 min, range-diff unchanged, so no re-review
- Human interventions: 0
- Bot status at readiness: completed-current
- Retro: [#281](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/281), open for the owner
- Evidence limits: usage unknown

## Learnings and next evaluation

- What helped or caused avoidable cost: a fresh orchestrator per item cost about a minute at each boundary and lost no handoff. Fallback wakes never overlapped a PR watch, since each was deleted at hand-back before the watch began, and none found a stall. The largest avoidable cost was STY-096's first build: the grilling adopted i18next without measuring it against the site's script budget, costing a full build, a review round and a rework (fixed in #274). Two rebases followed owner merges to `main` mid-review (CHO-044, STY-098), each in a few minutes with no re-review, as `pull-requests.md` (_Update a branch_) already sets.
- Follow-up work: [STY-099](../../backlog/EPC-029-public-site-dhcw-design-tokens/STY-099-the-public-site-takes-the-dhcw-design-tokens.md) awaits design input; [DEF-033](../../backlog/_archive/defects/DEF-033-the-editor-leaves-text-it-always-shows-in-one-language-unmarked.md) awaited triage at the run's end; retro PR #281 awaits the owner; the Welsh check of STY-096's new plural forms awaits the owner.
- Next comparison: whether a public-visible item held for approval adds more than its approval wait (here 15 to 16 min); whether owner merges to `main` during a run keep forcing rebases on the epic README. One run is too few to change guidance.
