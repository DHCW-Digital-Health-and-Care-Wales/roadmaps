# Reviewing a pull request

Read this when a user invokes `code-review` or `quality-review` on a PR number,
or with `--comment`. A delegated reviewer takes the pinned SHAs its brief
supplies, diffs them locally and never fetches or posts.

## Scope a PR from git

Fetch its head with `git fetch origin pull/<n>/head`, which works for forks and
leaves the working tree untouched, and record `git rev-parse FETCH_HEAD` as the
head. Fetch the base SHA too if it is missing, then diff `<base-sha>...<head-sha>`
locally. Read the base SHA, title, body and links from the PR's metadata, and
its changed files and diff from git: the API's file list and diff run to
hundreds of thousands of characters on a large PR.

## Post with `--comment`

Post one `COMMENT` review, never `APPROVE` or `REQUEST_CHANGES`: create it
pending, add each finding as an inline comment at its location where supported,
then submit it with the verdict as its body.

- `code-review`: each inline comment carries the finding's priority, trigger,
  failure and fix; the body carries the verdict, requirements coverage and
  verification limits.
- `quality-review`: each inline comment carries the grade emoji, title, cost
  and fix; the body carries the verdict, read list, strengths and handed-off
  list.

End every body with the attribution footer the session requires.
