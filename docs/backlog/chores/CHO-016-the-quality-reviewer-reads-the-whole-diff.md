# CHO-016: The quality reviewer reads the whole diff in one pass

- **Status**: Needs grilling — the owner decides what the quality lane's reviewer runs
  as (Q1)
- **Type**: Chore
- **Area**: Docs (agent definitions and skills)
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — one agent definition and one table row once the owner
  has decided, then two deliveries measured
- **Delivered**: _(add on delivery)_

## Summary

The quality lane's one reviewer (`quality-reviewer`, Sonnet) finishes a delivery's diff
in one to two minutes and leaves part of it unread. When its brief asks, it names the
part, and a second reviewer reads it: on four of the last five stories that cost one or
two more reviews each, and each time they found a "should fix". Rewording the review
skills has not changed this, twice in earlier retrospectives and once more, tried and
dropped, in STY-045's. The reviewer runs at medium reasoning effort; Opus at the same
effort reads the whole diff. Done: a quality review reads a diff of this size in one
pass, or the owner has chosen to keep the second pass.

## Measurement

On `main` at `2d3ba9e`, from the reviewer session logs of the EPC-011 delivery run
(2026-11-14 and 15). Every native reviewer ran at medium effort; Sol ran at high.

| Delivery | Sonnet's first pass left unread                                                                                                        | The passes that read it                                            |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| STY-041  | About 1,700 of 3,555 added lines (two test files beyond their names, the Welsh catalogue, three specs, the snapshots)                  | One, 2 min 32 s: 3 🟡, 3 💭                                        |
| STY-043  | Three parts: every diff command capped with `head`, two saved outputs not opened                                                       | Two (one for an Opus reviewer's part): 176.4k tokens beside 182.1k |
| STY-044  | Round 1: four snapshots, the record's first 95 lines, two test diffs' context. Re-check: the record's lines cut at 400 characters      | Two, 46 s and 51 s, 56k and 37k tokens beside 150k: 2 🟡, 2 💭     |
| STY-045  | Round 1 (2.0 min, 109.8k tokens): the record's lines 31 to 99. Re-check (1.0 min, 62.0k): six test files' diffs, a saved output unread | Two, 1.0 and 0.5 min, 65.8k and 36.0k tokens: 1 🟡, 3 💭           |

- **The diffs**: STY-045's was 4,040 lines and 172,578 characters (its re-check's 2,835
  and 124,309); STY-044's 5,597 lines and 270,386 characters. One command's output holds
  about 30,000 characters; a longer one is saved to a file the reviewer has to open.
- **Opus, same effort**: opened every saved output (3 of 3 on STY-044, 2 of 2 on
  STY-045) and reported the whole diff read: 5.4 minutes and 155.4k tokens on STY-045's.
- **Wording**: the retrospectives of STY-043 and STY-044 each reworded step 1 of both
  review skills. After them STY-045's first reviewer opened both its saved outputs and
  its re-checker did not open its one.
- **A third wording, tried and dropped** (STY-045's retrospective): step 1 reworded to
  "write the diff to one file and read it from its first line to its last", given to
  four fresh Sonnet reviewers on STY-045's two diffs, in briefs that did not ask what
  was left unread. None read the file (two wrote it, one mistyped the command); three
  read the skill itself through `head`; two reported the diff as read in full, one
  named what it had not read. They took 44 to 87 seconds and 44k to 76k tokens.
- **Not measured**: Sonnet at high effort. A reviewer's effort is the definition's to
  set, and a definition edited during a session did not reach reviewers started later
  in it, so the trial ran at medium.

## Acceptance criteria

### S1: The quality lane runs as the owner chose

**Given** the owner's answer to Q1
**Then** `.claude/agents/quality-reviewer.md` and the lane table and _Review rounds_ of
`.agents/skills/implement-story/references/delegation.md` name that model and effort
**And** nothing else in `.agents/` or `docs/operations/` names the old one

### S2: Two deliveries are measured

**Given** the next two deliveries whose diff is over 100,000 characters
**Then** this record's Delivery gives, for each quality review, its duration, its
tokens, the saved outputs it opened of those it had, and the parts it reported unread
**And** where a first pass still left a part unread, the record says so and names the
option of Q1 to try next

## Open questions

- **Q1**: What should the quality lane's reviewer run as? On STY-045 the Sonnet
  reviewer left 69 lines of the story's record unread, and its re-checker six test
  files' changes; two more reviewers read them, and one found a "should fix".
  - (a) Sonnet at high effort (recommended, as a trial) — the reviewer runs at medium
    now. Adds one line to its definition and S2's two measured deliveries; untried, so
    if a part is still left unread the answer moves to (b) or (c). Costs more tokens
    for each review, by an amount S2 gives.
  - (b) Opus — the quality lane's reviewer becomes a second Opus reviewer, with its own
    brief and skill as now. Opus read whole diffs at medium effort in the correctness
    lane; one pass of STY-045's took 5.4 minutes and 155k tokens, against Sonnet's two
    passes at 3.0 minutes and 176k. Changes the definition and the lane table.
  - (c) Keep Sonnet at medium, and the second pass — nothing changes. Each large diff
    pays one or two more reviews of under a minute, off the delivery's critical path,
    and the lane rests on the reviewer naming what it skipped, which its brief now asks
    for. This record closes Won't do.

## Decisions

## Out of scope

- The correctness lane's reviewers (Opus, Sol): both read the whole diff.
- Splitting a quality review between several reviewers by path: each would load the
  same guides, and none would see a copy made across the split.
