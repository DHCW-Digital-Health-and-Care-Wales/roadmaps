# Review and publish a branch

1. Collect the screenshot manifest per `screenshots.md`; keep image files out
   of commits. The PR's base is the remote default branch, or the
   prerequisite's branch in a stacked delivery the user asked for; resolve its
   full SHA. Record the merge-base with it and the implementation head.
   Confirm the worktree is clean after committing the intended changes;
   include untracked files deliberately if reviewing before the commit. Every reviewer gets the same snapshot.
2. Dispatch the reviewers `delegation.md` sets, each reading its skill. Store their reports
   independently. Resolve every actionable finding or record its
   evidence-backed disposition in the PR. An unresolved P0/P1 from either
   correctness reviewer blocks a passing correctness verdict. Re-review the
   final head after fixes, in the rounds `delegation.md` sets.
3. Write the PR body to a temporary file from
   `.github/pull_request_template.md`, following its comments. The title is a
   conventional commit subject naming the record, e.g.
   `feat(roadmaps): STY-010 show each roadmap's owner`.
4. Push the existing task branch without force-pushing. Do not create a
   duplicate if a PR already exists. Create the PR with
   `gh pr create --base <base branch> --head <branch> --title '<title>' --body-file <body-file>`,
   adding one `--attach` per screenshot (`screenshots.md`), then read back the
   hosted image URLs. Link the PR to the session as the next call when the
   runtime supports it. Confirm the returned URL, and that the PR's head SHA
   (`gh pr view <n> --json headRefOid`) equals the reviewed local head
   (`git rev-parse HEAD`). A mismatch means the push sent another commit: a
   commit made on a detached HEAD reaches no branch.
5. Stop there by default (SKILL step 5). Merge only through `pr-watch.md`, when
   the user asked for merging, and never when the user said to leave it
   unmerged. Never approve, deploy, or change branch protections. If required
   checks or independent reviews are unavailable, report them and create only
   a draft PR (`--draft`) with accurate limitations; a draft is never merged.

Git push access and GitHub API access are distinct. Test the specific
operation before requesting configuration. A CLI login error or an unset raw
token is not proof that Git access is missing. Reuse injected authentication;
never extract credentials or request raw credentials in chat.

A rejected network operation is a blocker to diagnose. Finish and commit useful
local work, retain the prepared body and review reports, and report the exact
missing destination or permission. Retest after a meaningful configuration
change. No retro branch should discard or contaminate unpublished primary work.
