# STY-085: Rename the repository to roadmaps, so the editor opens at /roadmaps/

- **Status**: Proposed — acceptance criteria written from the owner's cut-over answers
  (2026-11-21, D1–D2, D5)
- **Type**: Docs
- **Area**: CI/CD + Docs
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-016 §Layout and name, ADR-007
- **Suggested model**: Sonnet — a sweep of names and addresses, then an observed
  cut-over

## Summary

The repository becomes `roadmaps`, ahead of the workspace move, so the editor opens at
`/roadmaps/` instead of `/roadmaps-editor/`. The old address gets no redirect; the
owner tells Product Leads the new one. One pull request changes every name and address
that describes the present, and the owner renames the repository and merges it at
once, so its deploy publishes the new address. Nothing in the editor changes beyond the
footer's link to the repository.

## Scope

Configuration, docs, and agent guides and skills. No application code: the base path already follows the repository's name (_Starting point_).

The cut-over, in order (D1), is listed in the pull request for the owner:

1. The pull request is reviewed and green under the old name.
2. The owner renames the repository in _Settings → General_, then merges the pull
   request at once; its push to `main` deploys under `/roadmaps/`.
3. The delivering agent, or the owner, observes S1 to S3 on that run and the live site,
   and records them in Delivery.
4. The owner checks the OAuth consent screen's branding (an app home page, if one is
   set) in Google Cloud and points it at `/roadmaps/`.
5. The owner tells Product Leads the new address (D2).

## Acceptance criteria

### S1: The editor opens at the new address

**Given** the repository is renamed and the pull request's push to `main` has deployed
**When** a Product Lead opens `https://dhcw-digital-health-and-care-wales.github.io/roadmaps/`
**Then** the editor loads, connects to Google with the existing OAuth client and lists
their roadmaps
**And** a deep link `/roadmaps/#/roadmaps/<id>` opens that roadmap, and the lead's
saved preferences (navigation folded, compact items, edit surface) are as they left
them, since the origin is unchanged

### S2: The old address is gone, as ADR-016 decides

**Given** the cut-over is done
**When** anyone opens `/roadmaps-editor/` or a deep link under it
**Then** GitHub Pages answers with its 404
**And** no redirect page or repository at the old name exists (ADR-016 _Rejected_)

### S3: CI builds, tests and deploys under the new base path

**Given** the pull request's run on `main` after the rename
**When** CI/CD runs
**Then** the E2E job serves the app under `/roadmaps/`, `verify`'s base-path guard
passes against the Pages configuration, and `deploy` publishes it
**And** no base path is written into code or workflow: it still comes from
`GITHUB_REPOSITORY` (ADR-007)

### S4: Every name and address that describes the present says roadmaps

**Given** the merged pull request
**When** the live tree is searched for `roadmaps-editor`
**Then** it is found only in history: `docs/backlog/_archive/`,
`docs/analysis/delivery-runs/`, a dated measurement (CHO-031 _Measurement_), and the
epic's and this story's own account of the rename
**And** the README (badge, address, clone commands, the hash-history example), the
package name and repository URL, `VITE_REPOSITORY_URL` in `.env.production` and
`.env.example` (the footer's repository link), the runbooks, ADR-004's example, the
agent guides and skills, the base-path test inputs, and links to this repository's
issues and pull requests in live records all name `roadmaps` (D3)
**And** ADR-007 is amended in place for the base path `/roadmaps/` (ADR-016
_Consequences_)

### S5: A developer's worktrees keep their ports

**Given** a developer has worktrees whose slots were claimed before the rename
**When** they pull the change and set up a new worktree
**Then** the existing worktrees keep their slots and ports, and the new worktree claims
a free slot, not one already held
**And** the slot registry lives under a `roadmaps` state directory

## Decisions

- **D1** (owner, 2026-11-21, STY-085 grilling Q1): the cut-over order → the pull
  request first, reviewed under the old name; the owner renames, then merges at once,
  so its deploy publishes `/roadmaps/`. Over renaming first and redeploying by hand,
  which leaves the docs on the old name meanwhile. Shapes Scope and S3.
- **D2** (owner, 2026-11-21, STY-085 grilling Q2): telling Product Leads → the owner
  handles it, with no drafted message in this story. Shapes Scope step 5.
- **D3** (agent, 2026-11-21): live links to this repository's issues and pull requests
  are rewritten too, over leaving them on GitHub's redirect, so a search for the old
  name finds only history. Archived records and delivery runs keep theirs (ADR-016
  _Agent guides_).
- **D4** (agent, 2026-11-21): the product's name in the interface, _DHCW Roadmap
  Editor_, is unchanged; only the repository and its address change.
- **D5** (owner, 2026-11-21, STY-086 grilling round 2): S5 is dropped. Every existing
  checkout and worktree is deleted after STY-086 merges, so the slot registry stays
  under `roadmaps-editor/` here and moves in STY-086 (STY-086 D5, S4). S4's search
  also finds the registry path in `scripts/worktree/worktree.sh` until then.

## Starting point

Audited at `cc11e44` on 2026-11-21:

- `build/resolve-base-path.ts` derives the base path from `GITHUB_REPOSITORY`, and both
  `vite.config.ts` and `playwright.config.ts` use it, so the build, CI's E2E run and
  `verify`'s guard follow the rename with no code change. The resolver's tests use the
  name only as sample input.
- The OAuth client's Authorised JavaScript origins hold the host only, without a path
  (`docs/operations/google-cloud-setup.md`), so the editor's sign-in needs no Google
  change. The consent screen's branding is not in the repository; the owner checks it
  (Scope step 4).
- The editor's preferences are in `localStorage`, scoped by origin; the origin is
  unchanged, so they survive.
- The Pages deployment in place is built for `/roadmaps-editor/`, so after the rename
  `/roadmaps/` is expected to show a blank page until `main` redeploys: the reason for
  D1's order.
- No other repository in the organisation names `roadmaps-editor`
  (`gh search code`, 2026-11-21); `product-roadmaps` does not link to the editor.
- `scripts/worktree/worktree.sh` keeps its slot registry under
  `$XDG_STATE_HOME/roadmaps-editor/worktree-slots`; it stays there until STY-086 (D5).
- GitHub redirects git operations and web links from the old name while no repository
  takes it; local clones' remotes still change in the README's clone commands.

## Out of scope

- The workspace move to `apps/editor`: STY-086.
- A custom domain for the editor: EPC-023 (ADR-016 _Consequences_, ADR-020).
- Local clone directory names and T3 project paths: each developer's own.
- A message to Product Leads: the owner's (D2).
- Moving the worktree slot registry: STY-086 (D5).
