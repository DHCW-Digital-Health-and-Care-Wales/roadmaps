# CHO-027: A settled thread leaves alone the ports and servers of a checkout another thread uses

- **Status**: Needs grilling — raised by STY-077's retrospective; the fix is a T3 Code
  setting or a habit of the owner's, the owner's to choose
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
last one (_Hand off before the orchestration retrospective_, step 3). So settling a
finished session of a run while the next item works in the checkout takes its ports and
servers mid-run. During STY-077's full gate the owner settled the STY-076 orchestrator
session in the T3 app. That killed the E2E server, and the rerun cost about 14 minutes of
a 71-minute delivery. It recurs whenever a thread in the shared checkout is settled
during a run. Done: settling a thread never tears down a checkout another session still
uses, and Playwright never falls back silently to the canonical ports in a parallel
worktree that has lost its `.env.worktree`.

## Measurement

The incident ran in the EPC-019 orchestrated run of 2026-11-19, in the checkout
`t3-a5abebbb`, with base `27b0101`. The evidence is in T3 Code's server trace, terminal
logs, settings and state, and in the delivery session's log, not in the repository:

| Area               | Measurement                                                                                                                                                                                                                                                                                                                                                                                                                                                           | Verdict                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| What ran           | At 17:50:46.925Z the T3 app sent `thread.settle` over its websocket (`orchestration.dispatchCommand` in `server.trace.ndjson`) for the STY-076 orchestrator thread (`mcp:launch:7a81620b…`). T3 then ran the project's settle script, `pnpm worktree:teardown`, in the checkout at 17:50:47Z: the trace's one terminal start in that window. A setup terminal log timestamped 17:50:46Z is T3 saving that terminal's history as the settle closed it, not a new setup | a settle by hand ran the teardown     |
| Same pattern       | Settles from the app at 17:49:55Z and 18:34:53Z ran the teardown in another worktree, `t3-c5930b61`                                                                                                                                                                                                                                                                                                                                                                   | each hand settle seen ran it          |
| Automatic settling | On by default: with no `sidebarAutoSettleAfterDays` set, T3 0.1.1 settles a thread idle for 3 days. Its sweep auto-settled the 13 STY-076 child threads at 17:50:47Z, and none started a script. Auto-settle skips a pinned thread; a settle by hand runs the script even for a pinned one                                                                                                                                                                            | not the cause of this teardown        |
| The gate's E2E run | 230 passed and 401 failed in 7.5 min. 400 failures were refused connections, on 21311 (the killed server) or on 4173, where workers that reloaded `playwright.config.ts` after the file was gone fell back to `DEFAULT_DEV_PORTS`. One was a 30 s timeout whose cause the log does not show                                                                                                                                                                           | run lost                              |
| Recovery           | The file was written by hand at 17:54Z, and the E2E rerun took 8m 30s. The registry kept no slot 31, so another worktree could have claimed those ports. The retro's `pnpm worktree:setup` then claimed slot 22 (21220, 21221), not the 21310 and 21311 the run's brief names                                                                                                                                                                                         | about 14 min; ports moved             |
| Fallback risk      | Locally, `reuseExistingServer` is on. A run in a worktree that has lost `.env.worktree` tests whatever already serves 4173, which may be another checkout's build                                                                                                                                                                                                                                                                                                     | a silent wrong-server run is possible |

## Acceptance criteria

### S1: Settling a thread during a run leaves the shared checkout alone

**Given** an orchestrated run hands item N+1 to a new session in the same checkout
**When** item N's session, or any thread bound to that checkout, is settled during the
run
**Then** the checkout keeps `.env.worktree`, its slot and its running servers until the
run ends

### S2: A parallel worktree without its ports file stops with the fix named

**Given** a linked git worktree (its `.git` is a file) that has no `.env.worktree`
**When** an agent runs Playwright or Vite in it
**Then** the run stops and names `pnpm worktree:setup`, never serving or testing on 5173
or 4173; a main checkout and CI keep the canonical ports

## Open questions

- **Q1**: How should settling a thread stop tearing down a checkout another session
  still uses?
  - (a) The owner turns off _run on settle_ for _Tear down worktree_ in T3 Code's
    project settings (recommended). It is the only option that needs no one to
    remember. Nothing in the repo changes, but a settled worktree's slot and servers then
    stay held until someone runs `pnpm worktree:teardown`. Deleting the worktree frees
    its slot at the next setup but leaves its servers running.
  - (b) Keep the setting. The owner settles a run's threads only after the run stops,
    and `orchestrate`'s handover and run summary say so. The repo changes one line. It
    relies on the owner remembering it mid-run, and a thread idle for 3 days in the
    shared checkout still auto-settles unless it is pinned.
- **Q2**: Should `scripts/worktree/dev-ports.ts` refuse the canonical ports in a linked
  worktree that has no `.env.worktree` (S2)? That would catch a teardown of any cause.
  It would also stop a worktree that T3 did not create (`git worktree add` by hand, a
  Claude Code `isolation: "worktree"` agent) until someone runs `pnpm worktree:setup`.
  `apps/editor/README.md` (_Parallel worktrees_) says today that such a checkout keeps
  5173 and 4173.

## Decisions

- **D1** (owner, 2026-11-19, the owner's review of the open PRs): Q1 (a). The owner has
  turned off _run on settle_ for _Tear down worktree_. The setting was there so that
  nothing lingers on an old thread, so a settled worktree's slot and servers now stay
  held until someone runs `pnpm worktree:teardown`; the owner may want another way to
  clear them. Q2 stays open.
