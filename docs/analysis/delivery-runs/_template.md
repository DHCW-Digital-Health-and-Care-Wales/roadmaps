# Delivery run: <queue title>

- Run key: <date-queue-slug; stable across resumes>
- Captured at (UTC): <timestamp>
- Started / stopped (UTC): <timestamps or unknown>
- Workflow revision: <commit containing the instructions used; note mid-run changes>
- Scope and policy: <queued items; merge policy (left open, merging authorized or stacked); stop constraints>
- Outcome: <completed / stopped / blocked; reason and pending work, including items waiting on an unmerged prerequisite>
- Coverage: <sources used; unknown metrics and reasons>

## Items

Repeat this section per item; use `unknown` rather than guessed values.
Counts are observed zero only when the corresponding evidence is complete.
Durations are elapsed minutes; parallel stages may overlap.

### <Item ID and title>

- Type / risk: <story, defect, chore or docs; relevant risk flags>
- PR / assessed head / outcome: <public PR link, SHA, left-open/merged/blocked>
- Models: <observed delivery, correctness (Opus, Sol), quality (Sonnet) and fix-worker models; unknown if unavailable>
- Timing: <delivery, verification, review, CI wait (babysat PRs only), retro and total elapsed minutes; sources/coverage>
- Reviews: <distinct reviewer tasks; rounds per lane; accepted findings by severity; declined count>
- Escapes: <accepted findings after every required lane passed this head, grouped by CI/bot/human; or unknown>
- Rework: <fix-worker tasks and observed fix pushes; separate later scope changes>
- Recovery: <failures, cancellations, questions/approvals, usage limits, head drift, stalls and action taken>
- Human interventions: <observed count and brief reasons, excluding new scope requests and the owner's review of an open PR>
- Bot status at readiness: <completed-current / completed-old-head / running / absent / failed / not babysat / unknown>
- Retro: <improvement PR link and state / no-op and reason / deferred and reason>
- Evidence limits: <missing coverage, exposed token/cost units if any, observed compaction incidents>

## Learnings and next evaluation

- What helped or caused avoidable cost: <observations with evidence>
- Follow-up work: <owning backlog record links, or none>
- Next comparison: <hypothesis to check on comparable items; no policy change implied>
