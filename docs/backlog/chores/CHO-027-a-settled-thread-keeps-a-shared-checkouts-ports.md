# CHO-027: A settled thread leaves alone the ports and servers of a checkout another thread uses

- **Status**: Needs grilling — raised by STY-077's retrospective; the fix is a T3 Code
  setting or a change to how `orchestrate` hands over, both the owner's to choose
- **Type**: Chore
- **Area**: Docs + E2E
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — a few lines of skill or script, once the owner picks
- **Delivered**: _(add on delivery)_

## Summary

The owner's T3 Code settings for this project mark the _Tear down worktree_ script
(`pnpm worktree:teardown`) to run when a thread settles. `t3.json` does not set this.
Teardown stops whatever listens on the slot's two ports, deletes `.env.worktree` and
frees the slot. `orchestrate` starts each item's session in the same checkout as the
last one (_Hand off before the orchestration retrospective_, step 3). So when a
finished session settles, the next item loses its ports mid-run. In STY-077 this killed
the E2E server during the full gate. The rerun cost about 14 minutes of a 71-minute
delivery. It happens at every handover in a run. Done: a settled session never tears
down a checkout another session still uses, and Playwright never falls back silently to
the canonical ports in a parallel worktree that has lost its `.env.worktree`.

## Measurement

The incident ran in the EPC-019 orchestrated run of 2026-11-19, in the checkout
`t3-a5abebbb`, with base `27b0101`. The evidence is in T3 Code's terminal logs and the
delivery session's log, not in the repository:

| Area               | Measurement                                                                                                                                                                                                                                                                                | Verdict                                |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| What ran           | T3 ran `worktree.sh setup` in the checkout at 17:50:46Z, then `pnpm worktree:teardown` at 17:50:48Z, from a terminal named `settle-tear-down-worktree-…`. The logs name the settled thread only by a hash. The STY-076 orchestrator session fits: idle since 17:32, its PR merged at 17:19 | settle ran the owner's teardown script |
| Same pattern       | At 17:49:55Z and 18:34:54Z, settles ran setup then teardown in another worktree, `t3-c5930b61`                                                                                                                                                                                             | every settle runs it                   |
| The gate's E2E run | 230 passed and 401 failed in 7.5 min. Every failure was a connection refused on 21311, the killed server, or on 4173: workers that reloaded `playwright.config.ts` after the file was gone fell back to `DEFAULT_DEV_PORTS`                                                                | run lost                               |
| Recovery           | The file was written by hand at 17:54Z, and the E2E rerun took 8m 30s. The registry kept no slot 31, so another worktree could have claimed those ports. The retro's `pnpm worktree:setup` then claimed slot 22 (21220, 21221), not the 21310 and 21311 the run's brief names              | about 14 min; ports moved              |
| Fallback risk      | Locally, `reuseExistingServer` is on. A run in a worktree that has lost `.env.worktree` tests whatever already serves 4173, which may be another checkout's build                                                                                                                          | a silent wrong-server run is possible  |
| What T3 honours    | T3 Code 0.1.1 never auto-settles a pinned thread, or one with auto-settle turned off (`isAutoSettlementCandidate`). Settling by hand still runs the script                                                                                                                                 | pinning is a lever                     |

## Acceptance criteria

### S1: A finished orchestrator session leaves the shared checkout alone

**Given** an orchestrated run hands item N+1 to a new session in the same checkout
**When** item N's session finishes and its PR merges
**Then** the checkout keeps `.env.worktree`, its slot and its running servers until the
run ends

### S2: A parallel worktree without its ports file stops with the fix named

**Given** a linked git worktree (its `.git` is a file) that has no `.env.worktree`
**When** an agent runs Playwright or Vite in it
**Then** the run stops and names `pnpm worktree:setup`, never serving or testing on 5173
or 4173; a main checkout and CI keep the canonical ports

## Open questions

- **Q1**: How should a session that settles stop tearing down a checkout another session
  still uses?
  - (a) `orchestrate` pins each outgoing session at handover, and the final
    orchestrator unpins them at the stop (recommended). Unpinned threads then settle and
    tear down after the run, which is when teardown is right. It costs a pinned row in
    the sidebar per item while the run lasts.
  - (b) The owner turns off _run on settle_ for _Tear down worktree_ in T3 Code's
    project settings. Nothing in the repo changes, but a settled worktree's slot and
    servers then stay held until someone runs `pnpm worktree:teardown` or deletes the
    worktree.
  - (c) Both. (b) keeps a manual settle from causing the same loss.
- **Q2**: Should `build/resolve-dev-ports.ts` refuse the canonical ports in a linked
  worktree that has no `.env.worktree` (S2)? That would catch a teardown of any cause.
  It would also stop a worktree that T3 did not create (`git worktree add` by hand, a
  Claude Code `isolation: "worktree"` agent) until someone runs `pnpm worktree:setup`.
  The README says today that such a checkout keeps 5173 and 4173.

## Decisions
