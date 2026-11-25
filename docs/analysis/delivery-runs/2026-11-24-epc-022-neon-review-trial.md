# Delivery run: EPC-022's unblocked API items, with a Neon review trial

- Run key: 2026-11-24-epc-022-neon-review-trial
- Captured at (UTC): 2026-11-25T09:00Z
- Started / stopped (UTC): 2026-11-24T23:17Z / 2026-11-25T08:08Z (the last retro's hand-back); the trial analysis and this record's publication followed.
- Workflow revision: `main` at `8c6e94f9` at the start. No guide change from this run's retros was in force: [#302](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/302), [#305](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/305), [#307](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/307) and [#309](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/309) stayed unmerged.
- Scope and policy: STY-091, STY-092, STY-100 and CHO-047 in order, each by a fresh delivery child under its own orchestrator session (Sonnet 5.5 medium, four sessions). Merging authorised for the four primary PRs; retro PRs left open. The owner added two trial review lanes, Neon correctness and Neon quality (`gemini-4-neon`, high), to every PR of the run, and asked for an assessment including wall-clock time. The trial changed no guide.
- Outcome: completed. Four primary PRs merged; four retro PRs open for the owner. The other EPC-022 stories and chores were left out as blocked (placeholders without acceptance criteria); defects were not in scope.
- Coverage: the run's progress log, handoffs, delivery and retro reports and per-PR reviewer records; reviewer start and end times from the T3 runtime's database for all 97 reviewer tasks; GitHub data at capture. No tokens or cost were reported by any session, so usage is unknown throughout. No compaction was observed.

## Items

Times are elapsed minutes from the progress log. "Review wall clock" sums each review round from its start to its last reviewer's finish; the figure in brackets is the same rounds ending when the last non-Neon reviewer finished. "High" counts accepted findings graded P0–P2 (correctness, security) or 🔴 (quality) by a reporter.

### STY-091 Migrations, tenant and the database test harness

- Type / risk: story; security-relevant (database roles, tenant isolation).
- PR / assessed head / outcome: [#301](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/301), head `7fba856c` (reviewed `f9c8cac0`, then a record-only commit), merged `d38185bd` 01:05Z.
- Models: Opus 5.5 high delivery; correctness Opus 5.5, `gpt-6.1-sol`; quality Sonnet 5.5; security Fable 5.2; Neon both lanes. Reviewers at high.
- Timing: delivery to PR about 95; CI wait about 9; retro 54; review wall clock 18.8 (17.8).
- Reviews: 14 tasks, 2 rounds with final passes. 26 accepted (8 high), 3 declined.
- Escapes: none observed.
- Rework: no fix workers, 0 fix pushes after the PR opened.
- Recovery: none. One interim "completed" status while the child's own gate still ran; it resumed by itself.
- Human interventions: 0 corrections. The owner chose the merge policy and asked whether each item would get a new thread.
- Bot status at readiness: CI green first time; no bot comments.
- Retro: [#302](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/302), open, now conflicting with `main`; Opus 5.5 high; 10 reviewer tasks; 15 accepted (3 high). Adds DEF-034.

### STY-092 The OpenAPI contract and generated schemas

- Type / risk: story; security-relevant (new dependencies, the wire contract).
- PR / assessed head / outcome: [#303](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/303), head `374dbc51`, merged `b42a16c8` 03:50Z.
- Models: Sonnet 5.5 high delivery; the same reviewer lanes.
- Timing: delivery to PR about 100, including a gate rerun for a flaky publish test (DEF-038); CI wait about 9; retro 7; review wall clock 20.6 (12.3).
- Reviews: 14 tasks, including re-runs for lockfile lines first left unread. 14 accepted (0 high), 1 declined.
- Escapes: 1. CI's Dependency review, on a manual run, found three high-severity `js-yaml` advisories that every lane missed; fixed before the PR opened, after the review cap.
- Rework: no fix workers, 0 fix pushes after the PR opened.
- Recovery: none.
- Human interventions: 0.
- Bot status at readiness: CI green first time on the PR head; no bot comments.
- Retro: [#305](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/305), open; Sonnet 5.5 high; 3 reviewer tasks; 1 accepted. New records from the delivery: DEF-035 to DEF-038.

### STY-100 The API traces its requests, read in a local Jaeger

- Type / risk: story; security-relevant (telemetry contents, inbound trace context, new dependencies and image).
- PR / assessed head / outcome: [#306](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/306), head `13e9266b`, merged `56f318d6` 05:32Z.
- Models: Opus 5.5 high delivery; the same reviewer lanes.
- Timing: delivery to PR about 81; CI wait about 9; retro 32; review wall clock 16.0 (16.0).
- Reviews: 21 tasks. 25 accepted (4 high), 6 declined.
- Escapes: none observed.
- Rework: no fix workers, 0 fix pushes after the PR opened.
- Recovery: none.
- Human interventions: 0.
- Bot status at readiness: CI green first time; no bot comments.
- Retro: [#307](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/307), open, conflicting with `main`; Sonnet 5.5 high; 8 reviewer tasks; 7 accepted (1 high). Adds DEF-039.

### CHO-047 A 422 never names a key the caller chose

- Type / risk: chore; security-relevant (what a refusal echoes).
- PR / assessed head / outcome: [#308](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/308), head `a0fe02c6` (fresh passes at `07523447`, then fixes not re-reviewed and a record commit), merged `07e3ce21` 07:40Z.
- Models: Sonnet 5.5 high delivery; the same reviewer lanes.
- Timing: delivery to PR about 88; CI wait about 3; retro 26; review wall clock 41.0 (37.1).
- Reviews: 19 tasks over 3 rounds; the third followed the owner's wider scope. 31 accepted (9 high), 4 declined, 1 false positive.
- Escapes: none observed.
- Rework: no fix workers, 0 fix pushes after the PR opened.
- Recovery: none.
- Human interventions: 1 owner question during the build: whether to reject unknown request fields now ("Turn it on now"). The orchestrator's relay put the owner's words and its own instructions in one message; the round-3 briefs then presented all of it as the owner's, and several reviewers accepted an unrequested guide line on that basis. One reviewer rejected it and it was removed. #309 words the reviewer-brief rule.
- Bot status at readiness: CI green first time; no bot comments.
- Retro: [#309](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/309), open; Sonnet 5.5 high; 8 reviewer tasks; 7 accepted (1 high). New records from the delivery: DEF-040 (Needs triage) and CHO-051.

## Neon review trial

### Method and limits

Each Neon lane read the same brief as its peer (Neon correctness with Opus and `gpt-6.1-sol`, Neon quality with Sonnet), at the same head, started together, with the same re-check and final-pass rules. Every finding was adjudicated on its evidence. The graders were each item's delivery or retro agent, all Claude models, which are also families under comparison. A separate Opus 5.5 analyst then tallied the 97 tasks and spot-checked about 20 verdicts that most affect the ranking, Neon-only findings and important Neon misses among them; all held. It did not re-read the other reports. The sample is 8 PRs of one epic, mostly one Python API. Finding counts depend on how each grader split or grouped nits; the uneven cases found flatter Neon quality against Sonnet.

All 97 tasks completed: no failures, retries, substitutions or writes to the shared checkout by any reviewer. The runtime did not report which model served the Neon runs.

### Wall clock per reviewer task

| Lane                        | Tasks | Median min | Mean min | Total min |
| --------------------------- | ----- | ---------- | -------- | --------- |
| `gpt-6.1-sol` (correctness) | 18    | 1.9        | 2.0      | 35.7      |
| Sonnet 5.5 (quality)        | 18    | 2.2        | 2.2      | 39.3      |
| Opus 5.5 (correctness)      | 12    | 4.6        | 4.5      | 53.6      |
| Neon quality                | 15    | 6.0        | 5.6      | 83.5      |
| Neon correctness            | 22    | 7.0        | 6.8      | 150.0     |
| Fable 5.2 (security)        | 12    | 7.2        | 7.4      | 88.8      |

Reviewers in a round run together. Over the 18 rounds that had a Neon reviewer, review wall clock was 137.0 min against 104.6 min had each ended with its last non-Neon reviewer: 32.3 min (31%) added. Neon finished last in 13 of the 18, Fable in 4 and Opus in 1.

### Findings

"Sole" is an accepted finding no other lane raised. Task counts differ by lane, so use the same-round table to compare. Opus ran no final passes.

| Lane             | Accepted | Sole | Sole high                              | Declined                |
| ---------------- | -------- | ---- | -------------------------------------- | ----------------------- |
| Neon correctness | 27       | 6    | 3 (one with its severity not accepted) | 5                       |
| Opus 5.5         | 18       | 7    | 1                                      | 3                       |
| `gpt-6.1-sol`    | 7        | 2    | 2                                      | 0                       |
| Neon quality     | 35       | 9    | 0                                      | 3                       |
| Sonnet 5.5       | 76       | 49   | 8                                      | 1                       |
| Fable 5.2        | 28       | 14   | 0                                      | 6, and 1 false positive |

| Same rounds only                 | Rounds | Accepted | Raised by only one of the pair |
| -------------------------------- | ------ | -------- | ------------------------------ |
| Neon correctness / Opus          | 10     | 21 / 18  | 15 / 12                        |
| Neon correctness / `gpt-6.1-sol` | 18     | 25 / 7   | 21 / 3                         |
| Neon quality / Sonnet            | 14     | 35 / 68  | 17 / 50                        |

In the five final fresh passes both ran on the same head, Neon correctness found accepted issues in three and `gpt-6.1-sol` in none.

Without both Neon lanes, 19 accepted findings would not have been raised by anyone, three of them P2: a developer-only test failure when a database variable was exported (STY-091, both Neon lanes), a command misclassification in a workflow script (STY-091 retro) and a roughly threefold slowdown building a large 422 (CHO-047). The last two came from final passes after the review cap. The others are lower severity, plus one P2 whose grade was not accepted. This does not show they would never have been found later.

Without each other lane, the run would have lost: Sonnet 49 (8 🔴); Fable 14 (none P0–P2); Opus 7 (one P2, a test race); `gpt-6.1-sol` 2 (both P2 on CHO-047, one of them the only real breach of that item's main rule, which both Neon lanes missed).

After the analyst's re-check, firm factual errors in reports were: Neon correctness 2, Neon quality 1, Fable 1; none recorded for Opus, `gpt-6.1-sol` or Sonnet, whose reports were not independently re-read. The graders' bar was uneven: broad "no leak" verdicts from other lanes were not counted, and one charge against Neon correctness did not hold. Neon reports were longer, with more declined findings than the other correctness lanes, higher severity grades, and in the quality lane long coverage and praise sections.

### Assessment

- **Neon correctness: worth a correctness seat.** It matched or beat Opus on shared rounds and was the only correctness lane whose final passes found anything. It costs about 7 minutes a task. The analyst suggests it replace Opus beside `gpt-6.1-sol` and take the final passes, keeping `gpt-6.1-sol`, which is quick and found the most important CHO-047 defect. Confidence low to moderate.
- **Neon quality: not worth a standing lane.** It raised about half of what Sonnet did on shared rounds, found nothing high that no other lane found, and took about 2.5 times as long. Confidence moderate.
- **Cost beyond time is unknown.** No lane reported tokens or price.

## Learnings and next evaluation

- What helped or caused avoidable cost: the lanes overlapped little, and each of Sonnet, `gpt-6.1-sol`, Opus, Fable and Neon found something no other did. First-round reviewers often left lockfile lines unread, costing extra tasks (STY-092, STY-100). No lane checked advisories for a changed lockfile (#305 proposes a local audit before review).
- Orchestration: no-op. Fallback wakes found no stall; every final hand-back arrived by notification. The relay problem occurred once and #309 covers the brief that went wrong.
- Follow-up work: DEF-034 to DEF-040 (DEF-034 and DEF-039 sit in the unmerged #302 and #307) and CHO-051.
- Next comparison: if Neon takes Opus's seat, compare accepted and sole P0–P2 findings, factual errors and added wall clock over about ten further PRs, including editor or public-site work, with token or price data if the runtime can report it. No policy change is made by this record.
