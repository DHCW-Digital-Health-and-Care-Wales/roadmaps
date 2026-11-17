# CHO-016: The quality reviewer reads the whole diff in one pass

- **Status**: In progress — S1 in the backlog triage PR; S2 measured STY-051 and STY-050
  (Delivery), each read whole in one pass, and three earlier reviews over 100,000
  characters after D1 are still unmeasured
- **Type**: Chore
- **Area**: Docs (agent definitions and skills)
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — the agent definition and each place `delegation.md`
  names the quality lane's reviewer once the owner has decided, then two deliveries
  measured
- **Delivered**: _(add on delivery)_

## Summary

The quality lane's reviewer (Sonnet, medium reasoning effort) finishes a delivery's
diff in one to two minutes with part of it unread. Asked, it names the part and a second
reviewer reads it: four of the last five stories paid one or two more reviews each, and
each time they found a "should fix". Rewording the review skills has not changed this.
Opus at the same effort read the whole diff on the last two stories. Done: a quality
review reads a diff of this size in one pass, or the owner has chosen to keep the second
pass.

## Measurement

On `main` at `2d3ba9e`, from the reviewer session logs of the EPC-011 delivery run
(2026-11-14 and 15). Every native reviewer ran at medium effort; Sol ran at high.

| Delivery | Sonnet's first pass left unread                                                                                                        | The passes that read it                                                                               |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| STY-041  | About 1,700 of 3,555 added lines (two test files beyond their names, the Welsh catalogue, three specs, the snapshots)                  | One, 2 min 32 s: 3 🟡, 3 💭                                                                           |
| STY-043  | Three parts: every diff command capped with `head`, two saved outputs not opened                                                       | One, and one for an Opus reviewer's part: 176.4k tokens together, beside the two first passes' 182.1k |
| STY-044  | Round 1: four snapshots, the record's first 95 lines, two test diffs' context. Re-check: the record's lines cut at 400 characters      | Two, 46 s and 51 s, 56k and 37k tokens beside 150k: 2 🟡, 2 💭                                        |
| STY-045  | Round 1 (2.0 min, 109.8k tokens): the record's lines 31 to 99. Re-check (1.0 min, 62.0k): six test files' diffs, a saved output unread | Two, 1.0 and 0.5 min, 65.8k and 36.0k tokens: 1 🟡, 3 💭                                              |

- **The diffs**: STY-045's was 4,040 lines and 172,578 characters (its re-check's 2,835
  and 124,309); STY-044's 5,597 lines and 270,386 characters. One command's output holds
  about 30,000 characters; a longer one is saved to a file the reviewer has to open.
- **Opus, same effort**: on STY-043 it read 150 of the 435 lines of the docs' diff,
  through a filter. On STY-044 and STY-045, after the first rewording, it opened every
  saved output (3 of 3, 2 of 2) and reported the whole diff read: 5.4 minutes and
  155.4k tokens on STY-045's.
- **Sol, high effort**: reported every changed path read on STY-045 (37, then 30 at its
  re-check); its sessions were not read for this record.
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
**Then** `.claude/agents/quality-reviewer.md` sets that model and effort
**And** `.agents/skills/implement-story/references/delegation.md` names them wherever it
names the quality lane's reviewer: the table of work and models, _Dispatch and
completion_, and _Review rounds_ (Lanes and the Final fresh pass)
**And** nothing in `.agents/` or `docs/operations/` names another model or effort as
the quality lane's reviewer

### S2: Two deliveries are measured

**Given** the next two deliveries whose diff is over 100,000 characters
**Then** this record's Delivery gives, for each quality review, its duration, its
tokens, the saved outputs it opened of those it had, and the parts it reported unread
**And** where a first pass still left a part unread, the record says so and names the
option of Q1 to try next

## Open questions _(answered: see Decisions)_

- **Q1**: What should the quality lane's reviewer run as? On STY-045 the Sonnet
  reviewer left 69 lines of the story's record unread, and its re-checker six test
  files' changes; two more reviewers read them, and one found a "should fix".
  - (a) Sonnet at high effort (recommended, as a trial) — the reviewer runs at medium
    now. Adds one line to its definition, the effort beside each place `delegation.md`
    names the reviewer (S1), and S2's two measured deliveries; untried, so if a part is
    still left unread the answer moves to (b) or (c). Costs more tokens for each
    review, by an amount S2 gives.
  - (b) Opus — the quality lane's reviewer becomes a second Opus reviewer, with its own
    brief and skill as now. In the correctness lane Opus, at medium effort, read the
    whole diff on STY-044 and STY-045 and left part of one unread on STY-043, so this
    is likelier than (a) to end the second pass, not certain to. One pass of STY-045's
    took 5.4 minutes and 155k tokens, against Sonnet's two passes at 3.0 minutes and
    176k. Changes the definition and each place `delegation.md` names the reviewer (S1).
  - (c) Keep Sonnet at medium, and the second pass — nothing changes. Each large diff
    pays one or two more reviews, of 30 seconds to 2 min 32 s each as measured; one
    that ends after the round's other reviews holds the delivery up, by 82 seconds on
    STY-044 and 18 on STY-045. The lane rests on the reviewer naming what it skipped,
    which its brief now asks for. This record closes Won't do.

## Decisions

- **D1** (owner, 2026-11-15, the owner's triage of the live chores and defects): Q1 (a), Sonnet at high effort, as a trial. If a first pass of either measured delivery (S2) still leaves part of the diff unread, the quality lane's reviewer becomes Opus (b), with no further owner question.

## Out of scope

- The correctness lane's reviewers: Opus left part of STY-043's diff unread and read
  STY-044's and STY-045's whole, and Sol reported STY-045's read. Changing either is
  another record.
- Splitting a quality review between several reviewers by path: each would load the
  same guides, and none would see a copy made across the split.

## Delivery

### S2: the measured deliveries

**STY-051** ([#128](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/128)):
round 1 over `25079d1..94b0063`, 41 files, 3,708 lines and 164,582 characters; the
re-check over `94b0063..98a107d`, 535 lines. Durations and tokens are the runtime's
totals in the delivery session's results for each reviewer; what each read is from the
reviewer session logs.

- **Round 1** (`claude-sonnet-5-5`, effort high): 2.7 min, 125.8k tokens. It had no
  saved output to open: it wrote the diff to five files and read each from its first
  line to its last, and read, outside them, CHO-019 whole and the diff of
  `write-failure-message.test.ts`. Git shows the story record's move to `_archive/` as
  a removal and an addition; the reviewer read the removal and the added file's lines
  1–25 and 190–302, which hold every line that differs from the old file. It reported
  nothing unread, and its log agrees. Findings: 2 🟡 and 4 💭, all fixed.
- **Re-check** (same model and effort): 0.6 min, 42.7k tokens. It had no saved output
  to open: it wrote its diff to one file and read it whole. It reported nothing unread,
  and its log agrees. Findings: 2 💭, fixed.
- **Outcome**: the first pass left nothing unread, so no second pass ran. Beside it, the
  Opus correctness reviewer took 3.3 min and 130.4k tokens over the same round 1 diff.
- **Not measured**: three quality reviews over more than 100,000 characters ran after
  D1 and before STY-051, their sessions outside this evidence: DEF-015
  ([#115](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/115),
  round 1 at `3611e9b`, 184,862); the reordering UX prototypes
  ([#118](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/118),
  round 1 at `607d1a0`, 330,720); and CHO-009's fresh pass
  ([#120](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/120),
  at `ea1d47a`, 100,417). By S2's "next two", their measurement is outstanding, not
  STY-051's; counting STY-051 in their place, or leaving D1's trial as it stands, takes
  an owner decision in Decisions.

**STY-050** ([#130](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/130)):
round 1 over `3f309cc..2c4fc7c`, 68 files, 8,150 lines and 342,827 characters; the
re-check over `2c4fc7c..c5dd96c`, 2,310 lines and 106,597 characters. The sources are
STY-051's.

- **Round 1** (`claude-sonnet-5-5`, effort high): 5.1 min, 255.9k tokens. It had no
  saved output to open: it wrote the diff to one file and read it in 15 consecutive
  ranges, from its first line to its last. It reported nothing unread, and its log
  agrees. Findings: 2 🟡 and 7 💭, all fixed bar one name kept on purpose.
- **Re-check** (same model and effort): 2.2 min, 100.6k tokens. It had no saved output
  to open: it wrote its diff to one file and read it whole in four ranges. It reported
  nothing unread, and its log agrees. Findings: 3 💭, two fixed and one declined.
- **Outcome**: the first pass left nothing unread, so no second pass ran. Beside it, the
  Opus correctness reviewer took 12.8 min and 208.8k tokens over the same round 1 diff
  and reported most of the test files' changes and `published-state.ts` unread; a
  second Opus reviewer read them in 3.3 min and 158.8k tokens and found a P2 there.
  That lane is out of this record's scope.
- **Not measured**: the same three reviews as STY-051's. Counting STY-051 and STY-050
  in their place is still the owner's decision.
