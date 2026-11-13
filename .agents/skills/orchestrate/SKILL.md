---
name: orchestrate
description: Orchestrate delivery of several backlog items (an epic, or chosen stories, defects and chores), one fresh delegated agent and reviewed PR per item, in sequence. Use for "orchestrate the delivery of …"; a single item uses implement-story.
---

# Orchestrate delivery

You own the queue, briefs, progress reporting and integration. Each item has
one fresh delivery agent following `.agents/skills/implement-story/SKILL.md`.
Read `.agents/skills/implement-story/references/delegation.md` before
dispatching workers, and
`.agents/skills/implement-story/references/pr-watch.md` before handling a PR
when the user authorized babysitting or merging. Explicit user merge and stop
policies govern both primary and retrospective PRs.

## 1. Establish or resume the queue

Read root `AGENTS.md`, `docs/AGENTS.md`, the named epics'
`docs/backlog/<epic-slug>/README.md` (its Stories table, sequencing and
Defects) and each epic's `delivery-notes.md` when there is one. Read the
items' top blocks: Status, Depends on and Severity. Live stories sit beside
their epic's README; chores under `docs/backlog/chores/`, defects under
`docs/backlog/defects/`; a terminal record is under `docs/backlog/_archive/`.
Order by dependency, then epic table order. If the requested selection omits
a required item, finish independent pre-flight and ask for the queue
decision.

State these policies, using the user's instructions where supplied:

- **Merge**: by default each item ends with a raised, reviewed, **unmerged**
  PR, linked and left for the owner's review. Each item branches from the
  current default branch. An item whose prerequisite exists only on an
  unmerged PR is blocked: report it and stop the queue there. Two policies
  change that, and only on the user's word:
  - _merging authorized_: the top-level orchestrator babysits each PR to
    green and squash-merges it per `pr-watch.md` before any dependant starts;
  - _stacked PRs requested_: the dependant branches from its prerequisite's
    branch and its PR targets that branch.

  When the queue contains a dependency chain and the user gave neither
  policy, ask for the queue decision before dispatching: stop at the first
  dependant, authorize merging, or stack. Independent items need neither.

- **Defects**: record new defects as `Needs triage` under
  `docs/backlog/defects/`, linked from the owning epic's `## Defects` per
  `docs/AGENTS.md`, and report them for triage. Work only on named items
  unless the user authorizes fix-first.
- **Stop**: after the queue, a named item, or a UTC time. At the stop point,
  start nothing new and let authorized in-progress work finish.
- **Session handoffs**: invoking this skill is the user's request for a new
  top-level session or thread per item, overriding runtime guidance to start
  one only when asked. When the runtime can start one, each item runs in a
  fresh orchestrator session started at the previous item's handoff, before
  the outgoing orchestrator runs its retrospective (step 6); a queue kept in
  one session is a process miss. Only a runtime that cannot start one keeps
  the queue in this session.
- **Models**: inspect the runtime's available providers and models.
  Top-level orchestrator sessions run Sonnet (`claude-sonnet-5-5`), or the
  runtime's nearest standard-tier model, at medium effort, because delegated
  agents do the heavy work; a session started on another model says so and
  launches its successors on the orchestrator model. Hand judgement-heavy
  orchestrator work (the orchestration retro's edits to agent instructions,
  investigating a hard failure) to a delegated agent on a fitting model. A
  delivery agent takes its record's Suggested model as a tier hint. Reviews
  run in the delegation reference's lanes, with correctness at least as
  strong as the delivery agent. Pass provider-specific settings through the delegation tool's
  supported options; report unavailable selections rather than substituting.
  A user's model instruction covers the items it named: copy its words into
  the handoff, and an item added later takes its Suggested model unless the
  user extends it.
- **Batching**: unrelated small defects or chores may share one agent/PR with
  separate test-then-fix commits. An item closing several defects, changing a
  domain port or touching `.github/workflows/` runs separately.

On resume, read the named run handoff first. Reconcile the checkout, item
state, task IDs and pending PR work before dispatching anything. A child
waiting for its reviewers is still active work: let its completion reach its
parent. Replace an agent only once it is terminal, as the delegation
reference defines it, or cancelled. Use its saved handoff, not a fresh start.

Completion: an ordered queue with prerequisite evidence, policies stated and
blocking queue decisions resolved.

## 2. Prepare the run

Check checkout status and branch, preserve unrelated work, and fetch the
remote default branch with `--prune`. Use the existing isolated checkout;
request a separate checkout through the delegation tool only when authorized.

Create a unique run folder with `mktemp -d /tmp/orchestrate-<slug>-XXXXXX`.
Keep `run-handoff.md`, `metrics.md`, `brief-common.md`, and progress, report
and screenshot folders there. Resume in the existing run folder when supplied.
Write briefs using `references/brief.md`. Read `references/run-summary.md`
to establish collection ownership and the run-summary destination.

Before the first delegation, check what the runtime's delegation tools
support: providers and models, async runs with completion notifications,
shared or separate checkouts, new top-level sessions, scheduled wake-ups, PR
linking and PR event notifications. Record each limitation in the run handoff. Keep task IDs and
links there. Completion notifications, where the runtime has them, supply the
lifecycle; progress logs are evidence read at milestones, on a targeted user
question or for the `owner-question` check below, not a polling mechanism. At
the item boundary, follow the session-handoff procedure below. A new
top-level session gets the durable run handoff; delivery and reviewer
subagents are still started with the delegation tool, never as top-level
sessions.

Completion: briefs and durable task state prepared, checkout ownership clear,
and required capabilities confirmed or their limitations reported.

## 3. Deliver each item

Tell the user the item's ID, full title and a short plain-language summary.
Mark it in progress in `run-handoff.md` with branch, pinned base, assigned
agent and `<run-folder>/progress/<ITEM>-handoff.md`.

1. Start one fresh delivery child with the runtime's delegation tool, on the
   existing checkout, with a complete brief; run it asynchronously when the
   runtime offers async delegation with completion notifications, otherwise
   in the foreground. It implements, verifies, starts fresh independent
   reviewer grandchildren, waits for them, fixes findings and opens the
   reviewed PR. The delegation reference owns reviewer re-check rounds.
2. Save returned IDs/link and pending state. If the runtime can schedule a
   wake-up for this session, set a fallback wake every 45 minutes, prompting a
   check of that child, and save its ID in `run-handoff.md`; it catches a
   completion notification that never arrives. After independent work is
   exhausted, end the turn; the child's completion resumes this session. A
   yielded turn with live descendants is not a completed item; use no other
   polling, sleep loops or timeout workarounds.
   - On a fallback wake or an interim completion, ask the user each
     `owner-question` in the progress log that `run-handoff.md` does not list
     as asked, then list it there with the time, and later the answer. Send
     an answer that arrives before the child's PR to the running child, if
     the runtime can message it, so one build absorbs it; after hand-back
     (item 3), resume the child or start a fresh delivery child from its
     handoff with it.
   - On a fallback wake, read the child's handoff record and the progress
     log. If they record its final hand-back (the reviewed PR or a blocker),
     read its result and continue from item 3. Otherwise end the turn; the
     next wake checks again.
   - Delete the fallback wake once the child's final hand-back reaches this
     session by either path. A yield's interim completion keeps it running.
3. On completion, verify the returned branch/head against the checkout and
   handoff, and distinct reviewer task IDs and pinned heads against the claimed
   passes. An early hand-back or mismatch is unfinished work to reconcile,
   not permission to proceed. Read the result and current handoff. Distinguish an open PR,
   a blocker, and unfinished work. Report findings, verification and PR URL.
   For each open owner question, say whether its answer can change the PR.
   If the runtime can link a PR to the session, link every PR created, taken
   over or pushed to right after the write, per the PR reference; children
   link their own PR writes too.
4. By default the item's PR stays open for the owner: report it ready for
   review and record its URL and head. Only when the user authorized
   babysitting or merging does the top-level orchestrator own PR event
   triage, readiness decisions and merge (implement-story step 5): handle
   routine status updates directly; delegate substantive investigation/fixes
   with `pr-watch.md`'s bounded handoff, giving each fix worker the fallback
   wake of item 2. Forward actionable evidence, not every notification.
   Children return updated heads and verification; they never watch PRs. Keep
   one writer per checkout and reconcile events received during its task on
   completion. Independent reviewers remain fresh. With merging authorized,
   hold the merge only for an open owner question whose answer can change the
   PR, and record any other answer after. Log the post-PR stages as they
   happen per `references/brief.md`; delivery children cannot report future
   CI, merge or retrospective outcomes.
5. After the primary outcome (raised, or merged when authorized), run one
   separate retrospective per item (implement-story step 6). Its PR follows
   the same review lifecycle and the same PR policy, so it too stays unmerged
   by default, and it has no retrospective of its own. It branches from the
   default branch and stays independent of an unmerged primary PR; otherwise
   record the finding as deferred per the retro skill.

Use completion reports and compact handoffs instead of reading full
transcripts. For a specific question or suspected failure, read targeted
session activity, current PR state or code as needed. Report screenshot paths
as Markdown images when supplied. Report milestone findings, check outcomes,
blockers and merge SHAs. Record token usage and cost only where the runtime
reports them (`references/run-summary.md`); mark what it cannot see, such as
another provider's sessions, partial rather than estimating it.

Start the next item only after the primary and retro outcomes are recorded,
the checkout is clean on the intended base, and the run's merge/branch policy
allows continuation: a dependant of an unmerged PR waits unless merging or
stacking was authorized. Before reusing a merged branch, follow `pr-watch.md`.
A current item's blocked outcome stops the queue as agreed in step 1.

### Hand off before the orchestration retrospective

After the item report (step 4), if another eligible item remains, the stop
policy permits it and the runtime can start a new top-level session, hand off;
the invocation authorizes the launch (step 1's session-handoff policy):

1. Save the queue, policies, completed
   PR heads/outcomes, learnings, metrics, checkout path/branch and next item
   (not started) in `run-handoff.md`. Keep the same run folder and reserved
   run-summary filename across sessions. Capture the outgoing session's retro
   evidence separately at `<run-folder>/reports/orchestrator-<ITEM>.md` and
   save that report path in the handoff so the final orchestrator can read it
   without relying on updates to the next item's state.
2. Finish the current item's child work and remove its PR watches and
   fallback wake. Verify the checkout is clean on the intended base (the
   default branch, or the prerequisite's branch for a stacked dependant);
   carry unresolved work as a blocker rather than launching a duplicate
   delivery. Withhold the launch if the queue is blocked, finished or stopped.
3. Start the new top-level session bound to the same checkout and designated
   branch, titled with the next item's ID/title, with the message
   `/orchestrate resume <absolute run-handoff path>`. Set its model and
   effort explicitly to the orchestrator model of step 1, or the one the user
   named for the queue's orchestrators, never inherited from the outgoing
   session. Confirm the new session's checkout binding and
   give the user its link. After an error or a lost reply, look for a
   session it created before retrying, and record its ID/link to avoid
   duplicates.
4. The new session owns the queue and shared checkout. It reads the handoff,
   checks prior outcomes and starts only the next item with a fresh delivery
   subagent. The outgoing session runs its orchestration retro (step 6) from
   its saved evidence, then ends; it never delivers another queued item.
   After launch, the outgoing session must not change the shared checkout or
   shared run records. Use a separately authorized checkout for retro edits,
   or save findings in its own scratch record and defer publication.

If the runtime cannot start a new top-level session, continue the queue in
this one: run the orchestration retro at the final stop only, and keep the
run handoff current so a later session can resume. If a launch fails without
creating a session, preserve the handoff and report the exact blocker and
resume command. At the final item or stop point, skip the launch and use
step 5 instead.

Completion per item: primary and retro raised and left open (the default),
merged when authorized, or blocked with exact outstanding work; user updated;
handoff and metrics current.

## 4. Report metrics

For each item report:

- ID, full title and a short summary, PR URLs, and merge SHAs where merging
  was authorized;
- changes, departures, new backlog items (ID/title/summary) and blockers;
- screenshots with captions where available;
- delivery/reviewer identity and model, measured duration, tokens and cost
  when available, with absent usage marked partial;
- stage timings, review rounds, findings fixed or excepted, and, where the PR
  was babysat, CI wait and fix pushes, including findings first caught by CI
  or bots.

Update `brief-common.md` with relevant learnings before the next item starts.
Update `run-handoff.md` with queue, task IDs, PR heads, policy, outcomes and
next concrete action. Carry the compact record through context compaction.

## 5. Stop and summarise

At the agreed stop point, empty queue or blocker, start no new item. Finish or
explicitly cancel any superseded delegated tasks; preserve unfinished task
records. Remove this session's PR watches and fallback wakes before handing
back.

Report each item's title, outcome and PRs (open for review, or merged),
measured usage, new backlog items, remaining work, any item blocked on an
unmerged prerequisite, and report locations. Include screenshots where
available and the recurring misses, stalls or process findings supported by
`metrics.md`. Then run the orchestration retrospective below and publish the
run summary per `references/run-summary.md`, including no-op and blocked runs.

Completion: a self-contained user report and saved run summary, no orphaned
work or watches, and exact handoff/publication state for anything blocked.

## 6. Retro the orchestration

Run this retro after each successful session handoff and at the final stop.
Review only the outgoing session's actual orchestration friction using the
writing-for-agents skill and `docs/operations/authoring-agent-instructions.md`.
Use metrics, progress, reports and user corrections as evidence. Per-item
retrospectives already own item-specific improvements; change orchestration
guidance only for independent, repeatable orchestration costs. A no-op is
valid.

When justified, create one separate PR from the latest default branch using
an available authorized checkout/branch. Preserve any open primary PR and
follow the retro skill's independence rules; defer if safe separation is
unavailable. Run applicable checks, review it in the lanes
`delegation.md` sets, link the PR where the runtime can, and leave it for the
owner: orchestration retrospective PRs are not babysat or merged. At
intermediate handoffs, keep the run summary as a checkpoint in the shared
handoff saved before launch; publish no separate partial summary per item. The final orchestrator includes the
queue's run summary in its retro PR, or publishes a report-only PR when that
retro is a no-op, following `references/run-summary.md`. Intermediate retro
findings/PRs remain in the outgoing session's report for the final
orchestrator to reconcile.

Completion: one independent PR left open and linked, a documented no-op, or
a justified deferral with preserved work.
