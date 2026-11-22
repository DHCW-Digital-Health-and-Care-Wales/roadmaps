# Protecting main

How `main`'s ruleset is applied, changed and checked. The decision behind it is
[ADR-016](../adr/ADR-016-one-pnpm-workspace-for-the-editor-public-site-and-api.md)
(_Who may change `main`_ and its STY-087 amendments). Only the owner does these steps;
agents never change rulesets, branch protections or repository settings.

## What it holds

`.github/rulesets/main.json` is the ruleset, reviewed in pull requests like any other
change. On the default branch it refuses deletion and force-pushes, and requires
signed commits, a pull request merged by squash, the approval of a code owner
(`.github/CODEOWNERS`) on the last push, and the _CI result_ check from GitHub Actions
on a branch up to date with `main`. The owner is its one bypass actor, through a pull
request only: nobody pushes straight to `main`, and the owner merges a pull request past
its conditions with `gh pr merge <n> --squash --admin`.

_CI result_ is the gate job in `.github/workflows/ci.yml`
([the workflow](github-pages-deployment.md#the-workflow)). A pull request's run takes
that workflow from the pull request itself, so the check shows the change passed its
own checks; the code owner's review of the diff is the control on what those checks
are.

## Apply it

From a clone of `main` with the change merged, signed in to `gh` as the owner:

```sh
repo=DHCW-Digital-Health-and-Care-Wales/roadmaps
gh api --method POST "repos/$repo/rulesets" --input .github/rulesets/main.json
```

Then untick _Settings → General → Pull Requests → Allow rebase merging_, so a merge
through the bypass, which may skip the ruleset's squash-only rule with the rest, is a
squash too.

After a later change to the file, replace the live ruleset with it:

```sh
repo=DHCW-Digital-Health-and-Care-Wales/roadmaps
id="$(gh api "repos/$repo/rulesets" --jq '.[] | select(.name == "main-protection") | .id')"
gh api --method PUT "repos/$repo/rulesets/$id" --input .github/rulesets/main.json
```

## Check it

Compare the live ruleset with the file; an empty diff means they match:

```sh
repo=DHCW-Digital-Health-and-Care-Wales/roadmaps
id="$(gh api "repos/$repo/rulesets" --jq '.[] | select(.name == "main-protection") | .id')"
fields='{name, target, enforcement, conditions, bypass_actors, rules: (.rules | sort_by(.type))}'
diff <(jq -S "$fields" .github/rulesets/main.json) \
  <(gh api "repos/$repo/rulesets/$id" | jq -S "$fields")
gh api "repos/$repo" --jq .allow_rebase_merge   # false once rebase merging is unticked
```

Any of the organisation's owners can change a ruleset, so run the check after anyone
reports a change, and before trusting the gate after a long gap.
