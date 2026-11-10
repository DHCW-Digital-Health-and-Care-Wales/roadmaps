# Delivery and fix worker briefs

Each agent starts with no context but its brief and the shared run
brief it names. An agent reads only those, and its own skills fall back to
their defaults, so together they carry the run's policies and environment
facts. Substitute every `<…>` except `<ITEM>`, using absolute paths.

Write the sections that apply to every item (the shared review rules,
Environment facts, Run policies, Progress log and Final report) once, to
`<run-folder>/brief-common.md`, keeping `<ITEM>` as the placeholder. Each
agent's brief opens by telling it to read that file first and substitute its
item for `<ITEM>`, then gives its Task, review lanes and focus. Add each
item's learnings to the shared file before the next agent starts; a running
agent keeps the version it read. A learning later runs of the same epic need
goes to `docs/backlog/<epic-slug>/delivery-notes.md` too, since the run
folder does not outlive the run.

## Lifecycle

The delivery child owns implement-story steps 1–4: it raises the reviewed PR
and links it. The top-level orchestrator owns everything after: reporting the
PR ready for review, PR monitoring and merge only when the user authorized
them, and the retro.
Give the delivery child explicit authority to spawn fresh reviewer
grandchildren with the runtime's delegation tool, as described in
`.agents/skills/implement-story/references/delegation.md` (another provider's
model, such as Sol, needs a cross-provider delegation tool). It saves task IDs
and pinned heads; where the runtime offers async delegation with completion
notifications it ends its turn while reviews run and resumes on their
completion, otherwise it waits in the foreground. A review yield keeps the assignment pending;
the final handoff happens after the reviewed PR opens or a blocker is recorded.

Carry these environment facts into `brief-common.md`: complete briefs with
no inherited conversation, shared read-only reviewer checkout, whether
completion notifications reach the direct parent, and no parent polling or
sleep loops.
Require a current handoff containing open owner questions, reviewer
IDs/heads, findings and verification, PR URL/head and remaining work. Where
the runtime can link a PR to the session, children link every created or
pushed PR right after the write; they never watch it, and end their
report with `PR <full URL>, head <SHA>, checks and reviews <state>` when a
PR exists.
The top-level orchestrator honours the user's merge policy: by default it leaves
the PR open for the owner; when babysitting or merging is authorized it
follows `pr-watch.md`. It handles routine notifications directly and
delegates only substantive investigation/fixes with the PR URL, expected
head, actionable evidence, handoff path, checkout ownership, verification and
stop condition. A fix worker checks for head drift, returns a compact result,
and owns no PR watch; the top-level orchestrator reconciles new events and retains
readiness decisions. Apply the same boundary to any retrospective
implementation child. Record only usage the runtime or this run's own session
logs expose (`run-summary.md`); never search unrelated personal sessions.

After the item and its per-item retro reach their recorded outcome, the
orchestrator reports and, if the runtime can start a new top-level session,
hands the queue to one, then performs its own orchestration retro and ends.
The successor reads the same run handoff and starts a fresh delivery child.
Delivery and review children never launch that successor session themselves.

## Task

Name the item(s), their file paths and severity. Give the repository, the
base branch (the default branch, or the prerequisite's branch for a stacked
PR) and its current SHA, and confirm the checkout is clean on
`<designated branch>`. Tell it to read root `AGENTS.md` and follow
`.agents/skills/implement-story/SKILL.md` for the named item(s) through step 4,
the PR opened and linked, then hand back with its handoff record current and a
report on the implementation and reviews. For UI work, require before
screenshots at the beginning of the delivery session, before implementation
edits, and matching after captures per
`.agents/skills/implement-story/references/screenshots.md`. For
a batch, ask for one test-then-fix commit pair per item in one PR. If one item
grows far beyond the rest, it is delivered separately and reported.

## Reviews

Point to the review rounds and fresh reviewer briefs in
`.agents/skills/implement-story/references/delegation.md`: correctness by
Opus (`code-reviewer`) and Sol (Codex `gpt-6.1-sol`), quality by Sonnet
(`quality-reviewer`). Name the provider, model and settings per lane, and any
trial the user set. Name any recurring miss from earlier items for the
reviewers to check, such as a token reaching storage, a URL or a log, copy
missing its Welsh string, or an untrusted response not parsed with Zod.

## Environment facts

Carry forward what earlier items learned, for example:

- which tools the session pre-approves, and whether auto mode is on;
- whether `gh` GraphQL is refused, so REST `gh api` or the GitHub tools are
  needed;
- how delegated work reports completion (notifications, or foreground
  waits), per `delegation.md`;
- the PR policy: left open for the owner by default; babysat and merged per
  `pr-watch.md` only when authorized;
- that the merge method is squash, merged branches are deleted, and
  `git fetch --prune` comes before reusing the branch name;
- that `pnpm test:e2e` builds and serves on port 4173 and reuses a server
  already there locally, so a stale `pnpm preview` must be stopped first;
- that it keeps the `delegation.md` handoff record current at
  `<run-folder>/progress/<ITEM>-handoff.md`, in place of that file's
  `/tmp/roadmaps-<record-id>-handoff.md`, so it can be resumed after a usage
  limit or by a later orchestrator session.

## Run policies

- **Ownership**: the delivery agent stops once the reviewed PR is open and
  linked; the top-level orchestrator owns what follows and delegates substantive
  fixes.
- **Merge**: the PR stays open for the owner unless the user authorized
  merging; then the top-level orchestrator checks readiness and squash-merges per
  `.agents/skills/implement-story/references/pr-watch.md`. Name the run's
  merge or stacking policy here.
- **Retro**: one retro per item, with the same independent review lanes and
  the same PR policy (open by default).
- **Branch**: push only to `<designated branch>`, cut from the base the Task
  names. After a merge, reset it per `pr-watch.md` "Merge". Finish on that
  branch with the tree clean.
- **New defects**: record each problem found outside the named items,
  pre-existing ones included, as a `Needs triage` record under
  `docs/backlog/defects/`, link it from the owning epic's `## Defects`
  (`docs/AGENTS.md`) and name it in the report by its ID. Fix none outside
  the named items.
- **Attribution**: follow the session's commit trailer, PR and comment footer
  rules. Model identifiers are measurement evidence only in run summaries
  and scratch logs, not attribution in product code or narrative.

## Progress log

The delivery child owns reading, implementation, verification, its review
rounds/fixes and PR-open stages, ending with its handoff. The top-level orchestrator
owns the PR-ready report and, when authorized, CI wait, PR comments and
merge, plus the retrospective stages. A fix worker logs its assigned
investigation/fix, checks, reviews and push; the parent merges that evidence
into the run record after completion. Each stage has one writer.

Have the stage owner append a line at each stage start and finish to
`<run-folder>/progress/log.txt`, written as the stage happens:
`$(date -u +%FT%TZ) <ITEM> <stage> <start|done|note> <detail>`. Each stage
name is one hyphenated token, and results, failures and blockers go only in
`done` or `note` lines. Stages:
`reading`, `implementation`, `verification`, `review-round-1` onward (each with
lane, model, session, cost, findings by severity), `review-fixes`, `pr` (URL),
`ci-wait`, `fix-push`, `comments`, `merge` (SHA), `retro`, `retro-reviews`,
`retro-pr` (URL), `retro-merge` (SHA), `handoff` (the delivery agent's last
line, naming its handoff record) and `report`, plus `owner-question` at any
stage, logged as a `note` when a decision only the owner can make appears.
Stages a policy skips (`ci-wait`, `merge`, `retro-merge` on an unmerged run)
get no lines. As soon as screenshots are saved to
`<run-folder>/screenshots/<ITEM>/`, it logs
`<ITEM> screenshots note <absolute paths>`.

## Final report

Each agent sends its report as its last message, and also writes it to
`<run-folder>/progress/<ITEM>-delivery-report.md` (delivery agent) or
`<ITEM>-fix-report.md` (fix worker). The completion notification is the
primary report; the saved copy supports recovery. Keep the report self-contained:

Each reports only its completed assignment; mark later outcomes pending
instead of reporting future CI, merge or retro results. The top-level orchestrator
aggregates all stages into the run summary per `run-summary.md`. Each opens
with the item's ID, full title and a 2–3 sentence summary of the work:

- the outcome, PR URLs, merge SHAs where merged, and the default branch's
  final state;
- what was delivered, departures, follow-ups and new defects;
- a stage-timings table and, where the PR was babysat, the total CI wait and
  the number of fix pushes;
- every reviewer session: purpose, model actually run, duration and cost;
- review findings by severity: fixed, excepted, and caught later by CI or
  bots;
- every new record raised (defects, chores, `Needs grilling` ideas), each by
  ID, title and a one-line summary;
- the screenshot manifest: local paths, captions and published PR image URLs,
  or explicit publication blockers, per
  `.agents/skills/implement-story/references/screenshots.md`;
- blockers, and checks not run.
