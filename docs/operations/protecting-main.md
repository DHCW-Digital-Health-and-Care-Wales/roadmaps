# Protecting main

How `main`'s ruleset is applied, changed and checked, here and in `product-roadmaps`,
which publishes the public site ([product-roadmaps](#product-roadmaps)). The decision
behind it is
[ADR-016](../adr/ADR-016-one-pnpm-workspace-for-the-editor-public-site-and-api.md)
(_Who may change `main`_ and its STY-087 and STY-088 amendments). Only the owner does these steps;
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

Then untick _Settings → General → Pull Requests → Allow rebase merging_, so the
repository offers only the squash merge the ruleset allows. The owner's bypass does not
lift the ruleset's merge methods: a merge commit for one pull request, as STY-088's
history merge needed, takes the setting ticked and the live ruleset's
`allowed_merge_methods` widened for it, then this file applied again.

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
gh api "repos/$repo/environments/github-pages/deployment-branch-policies" \
  --jq '[.branch_policies[].name]'  # ["main"]: only main deploys
```

Any of the organisation's owners can change a ruleset, so run the check after anyone
reports a change, and before trusting the gate after a long gap.

## product-roadmaps

`product-roadmaps` decides what the public site publishes, so its `main` is protected as
this one is: `.github/rulesets/product-roadmaps.json` is `main.json` less the required
status check, which that repository has no CI to report (`build/ci-workflow.test.ts`
keeps the two in step). Its `.github/CODEOWNERS` names only the owner, and its workflows
read this repository's `main` with a read-only token
([the public site](github-pages-deployment.md#the-public-site)).

Apply it once, from a clone of this repository's `main`, signed in to `gh` as the owner.
It replaces that repository's own `main-protection` ruleset in place; the enterprise's
_Restrict Transfers_ ruleset, which its listing also shows, stays as it is:

```sh
repo=DHCW-Digital-Health-and-Care-Wales/product-roadmaps
id="$(gh api "repos/$repo/rulesets" --jq '.[] | select(.name == "main-protection") | .id')"
gh api --method PUT "repos/$repo/rulesets/$id" --input .github/rulesets/product-roadmaps.json
gh api --method PUT "repos/$repo/actions/permissions/workflow" \
  -f default_workflow_permissions=read -F can_approve_pull_request_reviews=false
```

Then untick _Settings → General → Pull Requests → Allow rebase merging_ there, as here.
A later change to the file is applied with the same `PUT`.

Check it as main's, with that repository and file; an empty diff means they match:

```sh
repo=DHCW-Digital-Health-and-Care-Wales/product-roadmaps
id="$(gh api "repos/$repo/rulesets" --jq '.[] | select(.name == "main-protection") | .id')"
fields='{name, target, enforcement, conditions, bypass_actors, rules: (.rules | sort_by(.type))}'
diff <(jq -S "$fields" .github/rulesets/product-roadmaps.json) \
  <(gh api "repos/$repo/rulesets/$id" | jq -S "$fields")
gh api "repos/$repo" --jq .allow_rebase_merge  # false
gh api "repos/$repo/actions/permissions/workflow" --jq .default_workflow_permissions  # read
gh api "repos/$repo/environments/github-pages/deployment-branch-policies" \
  --jq '[.branch_policies[].name]'  # ["main"]: a deploy run on another branch is refused
```
