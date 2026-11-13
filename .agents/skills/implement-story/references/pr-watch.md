# Babysit a PR to green, then merge

Read this only when the user asked for a PR to be babysat or merged. By default
a PR is raised and left for the owner (`../SKILL.md` step 5).

Babysitting begins once a real PR is confirmed. Record its URL, branch, current
head, UTC start and the user's merge instruction in the task handoff. It ends
in one of three states: the PR is **done**, it is **blocked**, or the user
stops it. There is no fixed interval; a green check run on an older head is
not done.

**Done** means all of these hold on the latest head:

- every check on it (the CI/CD workflow's `Verify` and `E2E (Playwright)`
  jobs, and any other), required or not, has succeeded or was skipped by its
  own conditions, and none is pending; confirm the push's run with
  `gh run list --commit <head-sha>`;
- GitHub reports the PR mergeable, with no conflict;
- the reviewers `delegation.md` sets have passed the latest head, or the last
  reviewed head differs from it only by fixes that _Review rounds_ exempts
  from review and the PR body's Review record lists, with no open P0/P1;
- every review, review comment or issue comment that raises a finding or asks
  a question is resolved, either fixed and pushed or answered on its thread
  with the reason.

Then squash-merge the PR, if the user authorized merging. If they asked only
for babysitting, report it done and ready for their review, and stop.

**Blocked** means the PR cannot become done without someone else:

- a draft PR, raised because reviews or checks were unavailable;
- the same external or infrastructure failure after one diagnosed rerun;
- branch protection requiring a human approval: every check is green and
  `reviewDecision` is `REVIEW_REQUIRED`;
- a merge the API refuses for a reason other than a moved head. A refusal
  because the head changed reopens the done check on the new head.

Report it blocked with the exact blocker and what is needed, then stop as for
a closed PR. It counts as finished for the workflow, never as done.

## PR events

The top-level session owns PR monitoring, even when a delegated delivery agent
opened the PR. Children return a current handoff after local work; they never
watch a PR.

1. Immediately after creating, taking over or pushing to a PR, link it to the
   session when the runtime supports that, for every stack layer. Report a
   linking failure.
2. Read the current head, checks and existing comments. Handle routine status
   changes, clean CI completion and readiness decisions directly. Delegate
   substantive investigation or fixes using the bounded handoff below; finish
   required branch updates (a rebase, per `pull-requests.md` step 4) and
   pushes before waiting on PR events.
3. If required work still waits on checks or reviews and the runtime can
   notify you of PR events, register for them and end the turn; on
   notification, reconcile the current head and act per the sections below.
   Without PR notifications, tell the user what is pending and stop; resume on
   their request. Never poll with sleeps, loops, `gh run watch`, `gh pr checks
--watch` or scheduled wake-ups.
4. When done, blocked, closed, or handing back to the user, remove any PR
   watch. Merge only when the Done conditions hold and the user authorized
   merging; a request to leave it open remains binding. A notification alone
   never establishes readiness to merge.

### Delegate actionable work

Triage notifications in the top-level session; coalesce related findings into
one bounded task. Intermediate check updates need no worker. Handle cheap local
corrections directly.

For substantive investigation or fixes, start a fresh worker per
`delegation.md` with the role brief in `.claude/agents/pr-fix-worker.md`.
Supply the PR URL, expected current head, the specific failure or finding and
evidence links, task handoff path, permitted files and checkout, required
verification and stop condition. Include authority to start fresh independent
reviewers when the fix needs them. Have the worker verify the head before
editing, fix each finding wherever it recurs (`../SKILL.md` step 4) and report
drift instead of applying stale findings. Assign one writer per checkout;
collect new events while it runs and reconcile them after completion rather
than starting competing writers.

The worker returns the finding's disposition, changed paths, verification,
reviewed/pushed head and remaining work in a compact handoff, links its pushes,
never watches, and ends its report as `delegation.md` requires. The top-level
session then re-reads the current PR state, handles outstanding review replies,
and decides whether to wait again, report a blocker or merge when authorized.

## Read current PR state

```sh
gh pr view <n> --json headRefOid,state,mergeable,mergeStateStatus,reviewDecision
gh pr checks <n>
gh api --paginate repos/<owner>/<repo>/pulls/<n>/reviews
gh api --paginate repos/<owner>/<repo>/pulls/<n>/comments
gh api --paginate repos/<owner>/<repo>/issues/<n>/comments
```

## Each event or observation

Classify every failure: changed-code defect, pre-existing defect, flaky test or
external infrastructure/access failure. Fix actionable in-scope defects,
reproduce failures locally where possible (the E2E job uploads
`playwright-report-attempt-<n>` with traces), repeat the relevant checks and the
reviews `delegation.md` sets for the new head, then push. Batch fixes into one
push where you reasonably can. Record unrelated defects in the backlog per
`docs/AGENTS.md`. Do not rerun a broken command unchanged without a diagnosis or
a meaningful state change. Respond to review comments with the actual fix or
evidence; never close an unresolved thread by assertion. GitHub replies are
authorized only for this PR workflow.

## Merge

Re-read the current PR state (above) just before merging;
anything new reopens the done check. Squash-merge pinned to that inspected head,
so a concurrent push makes the merge fail rather than land unreviewed:
`gh pr merge <n> --squash --match-head-commit <head-sha>`. Confirm the PR reads
merged and record the merge SHA. Never approve, deploy or change branch
protections; a merge to `main` deploys GitHub Pages through CI on its own.

After the merge, remove any watch. Reuse a branch name only once its PR is
merged or closed, because one branch cannot carry two open PRs: run
`git fetch --prune origin`, then `git checkout -B <branch> origin/<default>`.

A PR closed without merging, or blocked, ends babysitting the same way: remove
the watch and record why. If the session was interrupted, record the last
inspected head and time and what remains, and resume with a fresh snapshot.
