# CHO-021: The prototype page check gives reviewers each frame and the page's text

- **Status**: Proposed — found by the EPC-012 retrospective; tooling only
- **Type**: Chore
- **Area**: Docs
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — extends one script and its test, and one line of the
  ux-prototypes skill's step 8

## Summary

`check-page.mjs` writes one screenshot per design, as tall as the design: on the EPC-012
chosen page, one image of 1408×18,101px, which a model reading images sees shrunk to an
unreadable strip. Each reviewer and author then wrote their own scripts to see frames
and read the page's text, and both reviewers still reported the pages' 16,000 and 19,000
lines as read only in part. Done: the check also writes one screenshot per artboard and
a text extract of the page (each frame's caption, visible text and accessible names),
and step 8 of the skill hands both to the reviewers in place of the markup.

## Measurement

At commit `852097f`, from the EPC-012 prototype session (PR #133):

| Area                  | Measurement                                                                                                                                        | Verdict     |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Check's screenshots   | `shots-chosen/d1.png` 1408×18,101px; the Opus reviewer: "Screenshots: not viewed (the chosen page's image is 1408×18101)"                          | worth doing |
| Ad-hoc frame captures | the parent wrote 4 Playwright crop scripts to see single frames; the author wrote its own `shoot.mjs` for per-artboard shots                       | worth doing |
| Text for review       | the Opus reviewer wrote its own text-and-names extraction (`scratchpad/rv/chosen.txt`); both reviewers listed most of each page's markup as unread | worth doing |

## Acceptance criteria

### S1: One screenshot per artboard

**Given** a prototype page of frames
**When** the check runs
**Then** it writes, beside each design's screenshot, one image per artboard (desktop
and phone) named by design and artboard, each no taller than its frame

### S2: A text extract for reviewers

**Given** the same page
**When** the check runs
**Then** it writes one text file listing, per design and artboard in page order, the
frame's caption, its visible text and each control's accessible name

### S3: Step 8 hands them to reviewers

**Given** the ux-prototypes skill's step 8
**When** an author briefs the reviewers
**Then** the brief names the extract and the per-artboard screenshots as what to read
for the page, in place of its markup

## Decisions

## Out of scope

- Changing what the check fails on.
