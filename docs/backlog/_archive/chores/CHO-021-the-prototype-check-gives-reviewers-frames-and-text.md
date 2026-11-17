# CHO-021: The prototype page check gives reviewers each artboard and the page's text

- **Status**: Done — in its PR, awaiting merge
- **Type**: Chore
- **Area**: Docs
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — extends one script and its test, and one line of the
  ux-prototypes skill's step 8

## Summary

`check-page.mjs` writes one screenshot per design, as tall as the design: on the EPC-012
chosen page at `852097f`, one image of 1408×22,712px, which a model reading images sees
shrunk to an unreadable strip. In that session the parent, the prototype author and one
reviewer each wrote their own script to see single frames or read the page's text, and
both reviewers still reported the pages' markup (15,974 and 23,578 lines at `852097f`)
as read only in part. Done: the check also writes one screenshot per artboard and a
text extract of the page (each frame's caption, visible text, and each control's role
and accessible name), and step 8 of the skill hands both to the reviewers beside the
markup.

## Measurement

From the EPC-012 prototype session (PR #133); sizes at `852097f` unless marked as the
round-1 review's revision (`dba7eb4`):

| Area                  | Measurement                                                                                                                                        | Verdict     |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Check's screenshots   | `d1.png` 1408×22,712px at `852097f`; at `dba7eb4`, 1408×18,101px, which the Opus reviewer did not view: "the chosen page's image is 1408×18101"    | worth doing |
| Ad-hoc frame captures | the parent wrote 4 Playwright crop scripts to see single frames; the author wrote its own `shoot.mjs` for per-artboard shots                       | worth doing |
| Text for review       | the Opus reviewer wrote its own text-and-names extraction (`scratchpad/rv/chosen.txt`); both reviewers listed most of each page's markup as unread | worth doing |

## Acceptance criteria

### S1: One screenshot per artboard

**Given** a prototype page of frames
**When** the check runs
**Then** it writes, beside each design's screenshot, one image per artboard (the
`.ab` holding a desktop and a phone frame, `references/frames.md`), named by design and
artboard, each no taller than its artboard

### S2: A text extract for reviewers

**Given** the same page
**When** the check runs
**Then** it writes one text file listing, per design and artboard in page order, the
frame's caption, its visible text and each control's role and accessible name

### S3: Step 8 hands them to reviewers

**Given** the ux-prototypes skill's step 8
**When** an author briefs the reviewers
**Then** the brief names the extract and the per-artboard screenshots as what to read
for the page, beside its markup

## Decisions

## Out of scope

- Changing what the check fails on.

## Delivery

### Departures

None.

### Contract for dependents

The check writes, beside `d<n>.png`, one `d<n>-ab<m>.png` per `.ab` and one
`page-text.txt`. A design with no `.ab` (the working-component page) gets its whole
outline in the text and no artboard image. The outline is Playwright's
`ariaSnapshot`, so it leaves out what is `aria-hidden` or not rendered. The success
line now ends the design count with the artboard count; it still begins
"N designs captured".

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                  |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `.agents/skills/ux-prototypes/scripts/check-page.test.mjs` (_each artboard is captured beside its design, no taller than itself_). Observed run on the EPC-012 prototype page (`roadmap-page-shell-ux-prototypes.html`): 5 designs, 27 artboards, e.g. `d1-ab1.png` 1420×732 where `d1.png` is 1408×6685 |
| S2       | `check-page.test.mjs` (_the text extract lists, per artboard, each frame's caption, text and controls_); the same run wrote a 3,209-line `page-text.txt` with each frame's caption and its links, buttons and headings by name                                                                           |
| S3       | `.agents/skills/ux-prototypes/SKILL.md` step 8 (new "Both reviewers" bullet); a prose instruction, so reviewed, not tested                                                                                                                                                                               |

Red shown by breaking the finished code (the artboard screenshot taken of the design,
the text left empty): both new tests failed; the 29 existing ones still passed.
