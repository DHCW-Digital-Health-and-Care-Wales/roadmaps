# Delivery run: EPC-003 DHCW design system alignment

- Run key: 2026-11-10-epc-003-dhcw-design-alignment
- Captured at (UTC): 2026-11-11T00:23Z
- Started / stopped (UTC): 2026-11-10T17:08Z / 2026-11-11T00:20Z (STY-018's retro closed the queue)
- Workflow revision: dd83d07 at the start. Mid-run changes: d970cc0 (STY-014's retro: reviewers run
  binaries from `./node_modules/.bin/`, and code review knows the design-token lint) was on `main`
  before STY-015 started. From the STY-017 session on, the owner had orchestrator sessions run
  Sonnet at medium effort (run-local policy; this record's PR writes it into the orchestrate skill).
- Scope and policy: STY-013 to STY-018 in dependency order. Merging was authorized: the top-level
  orchestrator babysat and squash-merged each primary and per-item retro PR before the next item.
  One fresh top-level orchestrator session per item. Stop after STY-018. The owner rewrote STY-018
  before its delivery (no pixel baselines).
- Outcome: completed. All six stories merged; three per-item retros merged, three no-op.
- Coverage: the run's progress log, metrics table, run handoff, child handoffs, delivery and retro
  reports, each outgoing orchestrator's retro evidence, and PR state on GitHub. `metrics.md` stops
  after STY-016; STY-017 and STY-018 are filled from the log, the run handoff and the reports. Usage
  covers only the Claude reviewer token counts that delivery reports quoted. Delivery, retro and
  orchestrator sessions, and every Codex (Sol) session, reported no usage or cost, so usage is unknown
  for the run.

## Items

Delivery is the delivery child's start to its final hand-back. Reviews: P-levels from correctness,
🔴/🟡/💭 from quality. Every PR went green on its first CI run, and no human commented on any PR.

### STY-013 The app uses DHCW's colours, type and focus indicator

- Type / risk: story; theme tokens across every screen, contrast, focus.
- PR / assessed head / outcome: [#12](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/12),
  892b9d1 (reviewed 8cb13dc, then a record-only commit), merged as 68fa98f.
- Models: delivery Opus (high, Suggested); correctness Opus and Sol (`gpt-6.1-sol`, high); quality
  Sonnet; orchestrator Opus (high); retro Opus (medium).
- Timing: delivery 54 min (17:09–18:03); reviews about 20 min including re-checks and a final pass;
  CI wait about 4 min; retro 8 min to its merge. Item total 64 min.
- Reviews: 6 reviewer tasks. Opus round 1 (2 P3); Sol round 1 (P2: a focused toast kept a faint
  ring), re-check and final fresh pass, both clean; Sonnet round 1 (2 🟡, 3 💭) and re-check (1 🟡:
  the dark primary still used as text, fixed after the cap without re-review, listed in the Review
  record). Accepted all but one 💭, declined with its reason in the PR.
- Escapes: none observed.
- Rework: no fix workers; 0 fix pushes after the PR.
- Recovery: none.
- Human interventions: 0.
- Bot status at readiness: completed-old-head (8cb13dc; the later commit only records the PR).
- Retro: [#13](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/13), merged as 15f7447. STY-014's
  lint must reject the primary fill used as text.
- Evidence limits: reviewer tokens only: Opus 154k; Sonnet 88k and 37k.

### STY-014 Off-brand styling fails the build

- Type / risk: story; lint rules and theme lockdown across the whole app.
- PR / assessed head / outcome: [#14](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/14),
  66b1005 (reviewed 9f53155, then a Handoff-log commit listed in the Review record), merged as
  86a4138.
- Models: delivery Opus (high, Suggested) for both children; reviews as STY-013; orchestrator Opus
  (high); retro Opus (medium).
- Timing: delivery 58 min (18:14–19:13): the first child ran 36 min to its kill, reconciliation took
  4 min, the replacement 18 min. Round 1 about 13 min, re-checks about 7, final pass about 3. CI
  wait about 2 min (green at hand-back). Retro 8 min to its merge. Item total 69 min.
- Reviews: 7 reviewer tasks. Sol round 1, re-check and final fresh pass; Opus round 1 and re-check;
  Sonnet round 1 and re-check. Accepted 6 P2 (lint-rule gaps real ESLint runs exposed), 6 P3, 4 🟡,
  5 💭; declined 3 💭.
- Escapes: none observed.
- Rework: no fix workers; 0 fix pushes after the PR.
- Recovery: the first delivery child was OOM-killed at 18:51 during the round-1 fixes, under host
  memory pressure from other projects. Its commit and handoff survived, but the handoff held only
  one-line review summaries, so the orchestrator mined the dead session for the three round-1
  reports, saved the uncommitted diff and started a replacement from a resume brief.
- Human interventions: 0.
- Bot status at readiness: completed-current (66b1005).
- Retro: [#15](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/15), merged as d970cc0.
  Reviewers stop relinking `node_modules` through pnpm in a shared checkout; code review lists the
  design-token lint and its blind spots.
- Evidence limits: the killed child's usage unknown; reviewer tokens only for the re-checks: Opus 80k,
  Sonnet 46k.

### STY-015 Shared components look like DHCW's

- Type / risk: story; shared components, presentation.
- PR / assessed head / outcome: [#16](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/16),
  80e7437 (reviewed 7b581dc, then comment and record commits), merged as a5c120f.
- Models: delivery Sonnet (high, Suggested) for both children; reviews as STY-013; orchestrator Opus
  (high); retro Opus (medium).
- Timing: delivery 39 min (19:25–20:04): the first child ran 16 min to its kill, the replacement
  22 min. Round 1 about 5 min, re-check and final pass about 2 min. CI wait about 4 min. Retro
  7 min to its merge. Item total 51 min.
- Reviews: 5 reviewer tasks. Opus round 1 (3 P3, including Welsh header truncation at 375px); Sol
  round 1 and final fresh pass, both clean; Sonnet round 1 (1 🔴 docs drift, 1 🟡, 4 💭) and
  re-check (clean, 2 nits). All addressed; none declined.
- Escapes: none observed.
- Rework: no fix workers; 0 fix pushes after the PR.
- Recovery: the first delivery child was OOM-killed about 17 minutes in, during its first full lint,
  with no commits and no handoff record. The orchestrator saved its uncommitted diff and started a
  replacement 1 minute later, which verified and kept the work. The replacement's three concurrent
  reviewers ran narrow commands only, with no further kill.
- Human interventions: 0.
- Bot status at readiness: completed-old-head (3938675; later commits are comments and the record).
- Retro: [#17](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/17), merged as dc20e53. STY-016
  checks the Welsh short name in full at 375px, in Playwright.
- Evidence limits: the killed child's usage unknown; reviewer tokens: Opus 120k; Sonnet 92k and 50k.

### STY-016 The shell and pages are a DHCW staff service

- Type / risk: story; app shell, copy (en + cy), branding (ADR-010).
- PR / assessed head / outcome: [#18](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/18),
  9717af7, merged as 0f9f09e.
- Models: delivery Sonnet (high, Suggested); reviews as STY-013; orchestrator Opus (high); retro Opus
  (medium).
- Timing: delivery 29 min (20:17–20:46). Round 1 about 3 min for Opus and Sonnet; Sol finished at 20:36.
  PR to merge 17 min, about 11 of them waiting on the owner's answer. Retro 3 min (no-op). Item total
  48 min.
- Reviews: 6 reviewer tasks. Opus round 1 (1 P3: the Welsh name cut at 640–900px); Sol round 1 and
  final fresh pass, both clean; Sonnet round 1 (1 🔴, 2 🟡, 4 💭) and re-check (clean, 3 nits). After
  the owner's answer, one fresh Opus review of the orchestrator's docs push (1 P2 in the PR body,
  1 P3). Accepted all; declined 2 cosmetic hand-offs.
- Escapes: none observed.
- Rework: 1 fix push by the orchestrator (9717af7, docs only: ADR-010 amended for the owner's
  logo decision).
- Recovery: an owner question. The delivery child saw at minute 12 that the record's logo carries
  the NHS Wales mark, which ADR-010 ruled out, but flagged it for review instead of asking; it reached
  the owner at hand-back and held the merge about 11 minutes.
- Human interventions: 1 (the owner kept the DHCW lockup, D8).
- Bot status at readiness: completed-old-head (c99faea; later commits are the record and the D8 docs).
- Retro: no-op. The Welsh-width risk is now a Playwright check; the late question was one instance,
  and implement-story already says to ask at once.
- Evidence limits: reviewer tokens: Opus 106k; Sonnet 97k and 53k.

### STY-017 Failures stay on screen, and staff are warned before their session ends

- Type / risk: story; auth state machine (renewal), modal dialog, copy (en + cy).
- PR / assessed head / outcome: [#19](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/19),
  1300b01 (reviewed 1190596, then a docs reflow), merged as 215c0c1.
- Models: delivery Opus (high, Suggested); reviews as STY-013; orchestrator Sonnet (medium); retro
  Opus (medium).
- Timing: delivery to the first hand-back 57 min (21:05–22:02), including about 10 min waiting on the
  owner's spike. Round 1 about 9 min, round 2 about 3 min. The owner's later change (D9) took
  23:14–23:26 including its reviews. PR open to merge 97 min (22:01–23:38); the time before D9 is
  not attributed in the evidence. Retro under 1 min (no-op). Item total about 155 min.
- Reviews: 7 reviewer tasks. Opus round 1 (2 P3); Sol round 1 (1 P3), final fresh pass and a
  second final pass after D9, all clean; Sonnet round 1 (2 🟡, 2 💭), re-check (clean) and a
  re-check after D9 (1 🟡, 2 💭). Accepted all; none declined.
- Escapes: none observed.
- Rework: 0 babysitting fix pushes. Later scope: the owner's D9 (confirmations clear themselves),
  2 pushes by the delivery child.
- Recovery: the planned D3 spike needed a live Google sign-in, which the owner ran after being asked
  ahead at the STY-016 handoff. The orchestrator received three interim "completed" notices while
  reviewers were still pending, and one "cancelled" notice for a queued run nobody started; it
  checked pending runs each time and replaced nothing.
- Human interventions: 1 (the owner ran the D3 spike). D9 is later scope, not counted.
- Bot status at readiness: completed-old-head (0baaa8b; the bot did not review the post-D9 heads).
- Retro: no-op. The spike was a one-off; the dialog's focus return is held by a comment, an E2E test
  and the record.
- Evidence limits: reviewer tokens: Opus 139k; Sonnet 57k, 38k and 40k.

### STY-018 Tests hold the DHCW look without screenshots

- Type / risk: story; E2E test suite only, no app code.
- PR / assessed head / outcome: [#20](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/20),
  8f0db62 (reviewed 5b7fb4f, then a record-only commit), merged as c4eca0b.
- Models: delivery Sonnet (high, Suggested); reviews as STY-013; orchestrator Sonnet (medium); retro
  Opus (medium).
- Timing: delivery 33 min (23:41–00:14). Round 1 about 5 min, round 2 about 3 min. CI wait about
  4 min. Retro 1 min (no-op). Item total 38 min.
- Reviews: 5 reviewer tasks. Opus round 1 (3 P3); Sol round 1 (1 P2) and re-check (clean); Sonnet
  round 1 (5 🟡, 3 💭) and re-check (clean, 2 💭 left). One cause drew a finding from all three
  round-1 reviewers: the brief and the rewrite spec said `page.clock.install()` freezes time, and it
  does not. Accepted all but 1 💭, declined.
- Escapes: none observed.
- Rework: no fix workers; 0 fix pushes after the PR.
- Recovery: none. The owner's rewrite arrived while STY-017 held the shared checkout, so it waited in
  a spec file that STY-018's delivery committed first.
- Human interventions: 0. The rewrite is a scope change made before delivery.
- Bot status at readiness: completed-old-head (5b7fb4f; the later commit only records the PR).
- Retro: no-op. The wrong clock claim came from the orchestrator's brief, and the repo's guide was
  already corrected in the PR.
- Evidence limits: reviewer tokens: Opus about 105k; Sonnet about 100k and 83k.

## Learnings and next evaluation

- Avoidable cost: host memory. Two delivery children (STY-014, STY-015) were killed out of memory
  while running full typed lint on a host shared with other projects. Each replacement resumed within
  minutes, but the first left only review summaries and the second no handoff at all. This record's
  PR has the delivery handoff created at branch cut and each reviewer's report saved verbatim
  beside it. Run-local rules (one heavy command at a time, no preview server alongside, narrow
  reviewer commands) prevented a third kill.
- Avoidable cost: an owner question flagged "for review" instead of asked (STY-016), about 11 minutes
  of held merge and a docs push after review. One instance; implement-story step 2 already says to ask
  the moment it appears.
- Avoidable cost: an unverified gotcha in an orchestrator's brief (STY-018) cost one review fix round.
  One instance; review caught it in round 1.
- Helped: asking the owner ahead for STY-017's live sign-in, while STY-016's retro ran, kept the
  spike to a 10-minute wait. The Sonnet-medium orchestrator sessions (STY-017, STY-018) handled
  babysitting, owner relays and two owner changes; their one error was STY-018's unverified gotcha.
- Follow-up work: none recorded. The fluent Welsh review stays tracked in the README's Welsh note.
- Next comparison: whether delivery children on Sonnet and on Opus need the same review rounds per
  story size, and whether any delivery child is killed again with the handoff and memory rules in
  place.
