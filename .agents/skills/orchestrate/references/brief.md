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

The delivery child owns `.agents/skills/implement-story/SKILL.md` steps 1–4
(implement, verify, spawn fresh independent reviewer grandchildren per
`.agents/skills/implement-story/references/delegation.md`, fix findings, open
and link the PR, and mark its handoff record as handed back). The top-level
orchestrator owns everything after (reporting the PR, any authorized PR
monitoring/merge per `.agents/skills/implement-story/references/pr-watch.md`,
and per-item + orchestration retros); children never watch PRs or launch
successor sessions, and end their report with
`PR <full URL>, head <SHA>, checks and reviews <state>` when a PR exists.

Carry into `brief-common.md` the runtime's delegation facts (no inherited
conversation, shared read-only reviewer checkout, async notifications vs
foreground waits, no parent polling) and require a current handoff at
`<run-folder>/progress/<ITEM>-handoff.md` (with open owner questions, reviewer
IDs/heads, verification, PR URL/head and remaining work). Fix workers and
retrospective children follow the same ownership boundary and usage rules
(`run-summary.md`).

## Task

Name the item(s), their file paths and severity. Give the repository, the
base branch (the default branch, or the prerequisite's branch for a stacked
PR) and its current SHA, and `<designated branch>` as the run handoff records
it for this item, since a brief copied from the last item's keeps that item's
branch; confirm the checkout is clean on it. Tell it to read root `AGENTS.md`
and follow
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
`.agents/skills/implement-story/references/delegation.md`. Name the provider,
model and settings of each of its lanes, and any
trial the user set. Name any recurring miss from earlier items for the
reviewers to check, such as a token reaching storage, a URL or a log, copy
missing its Welsh string, or an untrusted response not parsed with Zod.

## Environment facts

Carry forward what earlier items learned, for example:

- which tools the session pre-approves, and whether auto mode is on;
- whether `gh` GraphQL is refused, so REST `gh api` or the GitHub tools are
  needed;
- how delegated work reports completion (notifications, or foreground
  waits), per `.agents/skills/implement-story/references/delegation.md`;
- whether a delivery child's yield reaches its parent as a completion
  notification that looks like its hand-back;
- for UI work, whether an economy or standard subagent can run the screenshot
  check `.agents/skills/implement-story/references/screenshots.md` sets;
- the run's PR policy (default open, or authorized babysit/merge/stacking per
  `.agents/skills/implement-story/SKILL.md` and
  `.agents/skills/implement-story/references/pr-watch.md`);
- that it creates the `.agents/skills/implement-story/references/delegation.md`
  handoff record when its branch is cut, before the first heavy command, and
  keeps it current at `<run-folder>/progress/<ITEM>-handoff.md`, in place of
  `/tmp/roadmaps-<record-id>-handoff.md`.

## Run policies

- **Ownership & PRs**: state the run's merge/stacking policy; delivery children
  stop once the reviewed PR is open and linked, and per-item retros follow the
  same review lanes and PR policy.
- **Branch**: push only to `<designated branch>`, cut from the base the Task
  names, and finish with the tree clean (after a merge, reset per
  `.agents/skills/implement-story/references/pr-watch.md`).
- **New defects**: record each problem found outside the named items,
  pre-existing ones included, as a `Needs triage` record under
  `docs/backlog/defects/`, link it from the owning epic's `## Defects`
  (`docs/AGENTS.md`) and name it in the report by its ID. Fix none outside
  the named items.
- **Attribution**: each agent ends its commits, PRs and comments with the
  trailer and footer its own runtime sets, since a child may run another
  model than yours; name no model or trailer here. Model identifiers are
  measurement evidence only in run summaries and scratch logs, not
  attribution in product code or narrative.

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
- a stage-timings table computed from its progress-log timestamps and, where
  the PR was babysat, the total CI wait and the number of fix pushes;
- every reviewer session: purpose, model actually run, duration and cost;
- review findings by severity: fixed, excepted, and caught later by CI or
  bots;
- every new record raised (defects, chores, `Needs grilling` ideas), each by
  ID, title and a one-line summary;
- the screenshot manifest: local paths, captions and published PR image URLs,
  or explicit publication blockers, per
  `.agents/skills/implement-story/references/screenshots.md`;
- blockers, and checks not run.
