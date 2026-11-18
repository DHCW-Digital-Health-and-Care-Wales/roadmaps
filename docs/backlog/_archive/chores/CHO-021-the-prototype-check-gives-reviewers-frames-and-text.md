# CHO-021: The prototype page check gives reviewers each artboard and the page's text

- **Status**: Done
- **Type**: Chore
- **Area**: Docs
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — extends one script and its test, and one line of the
  ux-prototypes skill's step 8
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/143

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
`page-text.txt`; it first deletes the earlier run's such files from the folder, so
nothing of a design or artboard since cut is left to be read. A design with no `.ab`
(the working-component page) gets its whole outline in the text and no artboard
image. A frame's outline is Playwright's `ariaSnapshot`, which leaves out what is
`aria-hidden`, so a closing line, `aria-hidden text drawn:`, lists the `aria-hidden`
text the frame does draw (a logo's words); text that is not rendered is in neither.
The success line still begins "N designs captured" and now ends it with the artboard
count.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `.agents/skills/ux-prototypes/scripts/check-page.test.mjs` (_each artboard is captured beside its design, no taller than itself_; _images of an artboard since cut are not left to be read_). Observed run on the EPC-012 prototype page (`roadmap-page-shell-ux-prototypes.html`): `d1-ab1.png` 1420×732 where `d1.png` is 1408×6685 |
| S2       | `check-page.test.mjs` (_the text extract lists, per artboard, each frame's caption, text and controls_). The same run's `page-text.txt` gives each frame's caption and its links, buttons and headings by name, and the header logo's words as drawn `aria-hidden` text                                                               |
| S3       | `.agents/skills/ux-prototypes/SKILL.md` step 8 (the lead-in now names the extract and the screenshots); a prose instruction, so reviewed, not tested                                                                                                                                                                                  |
