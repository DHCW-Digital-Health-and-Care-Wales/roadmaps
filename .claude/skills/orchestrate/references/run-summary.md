# Record and evaluate a delivery run

The top-level orchestrator owns one summary for the whole queue, including
stopped, blocked and no-op runs. Use
`docs/analysis/delivery-runs/_template.md`; save the record as
`docs/analysis/delivery-runs/<UTC-start-date>-<queue-slug>.md`, adding a short
unique suffix only when that name is taken. Reserve the name in the run
handoff at pre-flight. Resume the same record after interruption rather than
counting a continuation as a new run. A per-item top-level session
handoff is also a continuation: save metrics, sources and pending publication
in the shared handoff before launching. The successor becomes the collector;
the outgoing session keeps only its own retro evidence and does not modify
shared run files after launch. The final orchestrator consolidates one record
for the queue, not one record/publication PR per session.

## Collect once, at the source

Keep raw events and task/head correlations in the existing run folder,
`progress/log.txt` and `metrics.md`. `brief.md` assigns stage logging to the
actor doing the work. The top-level orchestrator aggregates child reports on
completion and logs its own PR stages; it never polls running tasks to fill
metrics. Record at milestones, not on a timer. Before compaction, save the
collection state and pending work in the handoff.

Correlate each finding with item, PR, reviewed head, lane and reviewer task
in scratch evidence. Count distinct tasks, runs and findings separately:
a run ordinal is not a yield count, a commit is not a push, and a repeat of
the same finding is not a new defect. Record both discovered and accepted
findings, with declined ones explained in the review evidence.

Use UTC timestamps and elapsed minutes from named sources. Parallel stages
can overlap, so their durations do not sum to total wall time. CI wait is
only time delivery was waiting on CI, not the sum of job durations; a PR left
open for the owner has none. Count fix pushes from observed pushes, never
from commit count. Record zero only when collection established none
occurred; otherwise write `unknown` with the reason and scope of missing
evidence. Capture tokens/cost only when the runtime reports them (a
completion notification's usage, a delegated task's status), with provider units and
coverage; never estimate them. Name the gaps: sessions whose usage nothing
reported, other providers' sessions, and sessions whose brief names no item.
For wall-clock phases inside one Claude session,
`.claude/skills/retro/scripts/session-timeline.mjs` reads its log.

For each item retain type/risk, workflow revision, observed models, outcome,
PR/head, stage durations, reviewer task counts and rounds, accepted findings
by severity, post-review escapes, fix workers/pushes, interventions and
recovery incidents. An escape is an accepted finding first raised after
every required lane passed the same head; later requested scope is not
an escape. A human intervention unblocks or corrects delivery; a new feature
request and the owner's review of a PR left open by policy do not count.
Recovery incidents distinguish failed/cancelled workers, questions/approvals,
usage limits, head drift and observed stalls. Stall time needs evidence of
lack of progress, not merely elapsed wait.

## Save and publish

At the stop point, consolidate one compact record from the run folder using
the template. Report the capture time, sources, missing coverage and any
pending work. Keep raw task/session IDs, prompts, transcripts, local paths,
credentials, personal data and detailed logs out of the committed record.
Public repo PR links and commit SHAs provide durable evidence. Log unknown
usage honestly; a summary does not require unavailable metrics to be filled.

Include the record in the orchestration retrospective PR when there is one.
If that retro is a no-op, publish one report-only PR on an authorized separate
branch cut from the default branch; it is evidence, not a manufactured process
improvement. Both kinds are left open for the owner per orchestrate step 6. A
report-only PR gets `pnpm format:check`, a check that each path and link it
cites exists, and the three review lanes `delegation.md` sets (docs-only), but
no automatic retrospective or babysitting of its own. Do not create one PR per item or event for metrics. If branch/access
constraints prevent publication, save the final record in the run folder, give
its location and exact publication blocker, and mark it unpublished in the
handoff; a no-op alone is not a reason to discard it.

The record describes the queue's primary/per-item-retro outcomes as observed
at capture time: open for review, merged, or blocked. Its own publication PR
is not another measured delivery; exclude its checks/reviews from those totals
to avoid a reporting loop. Link publication PRs immediately. An unfinished
publication is recorded in the handoff and user report, not asserted
complete. Correct materially wrong evidence in a later authorized docs change;
do not push cosmetic updates just to chase late events or add a merge SHA
that arrived after capture.

## Evaluate after real use

After roughly ten comparable items, review records by type/risk and workflow
revision. Compare counts and medians, accounting for diff size, model tier,
CI coverage, user-requested scope changes and unknown data. Look for review
passes that catch accepted defects, escapes after clean reviews (including
findings the owner raises on a PR left open), recovery needing intervention,
retro changes with demonstrated benefit, and context/compaction incidents. Log
observed compactions only when exposed.

Use these observations to propose changes to review rounds or retro
frequency; do not weaken either automatically. One serious escape or lost
handoff warrants immediate investigation. Small samples or no detected
findings do not establish equivalent safety. Recompute GitHub-derived facts
from linked PRs when useful, but keep head-specific bot status at readiness
because its summary can later be overwritten. Start with this manual record;
add collection tooling only after repeated friction justifies it.
