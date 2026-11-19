# DEF-021: The roadmap header grows for a frame as it lets go on scroll up, moving the items

- **Status**: Done
- **Severity**: Low — the items below the header jump 6 to 49 px for a frame or two as
  it lets go, by how many placements its links hold; nothing is lost, and a press that
  lands in that frame misses its target
- **Area**: Features/UI
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — a layout trace of one frame, then a fix in the header or
  its links
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/183

## Summary

Scrolling up past a roadmap's sticky header lets it go back into the page, and for one
or two frames its links are drawn 80 px narrower than they settle and the header is
taller, so everything below it sits lower, then jumps back. With the many placements of
a roadmap with unplaced items, at 1280 px, the links wrap and the shift is 49 px; with
few placements it is 9 px, and on a phone 6 px. `StickyHeader` says nothing below it
moves as it sticks or lets go. It made DEF-020's test press the wrong place, now and
then.

## Reproduce

At commit `a6a9683` on the default branch, in the E2E harness (Google faked, Chromium,
no load, `reducedMotion: "reduce"`):

1. At 1280×900, open `./#/roadmaps/producta` with the items of
   `tests/e2e/roadmap-items-compact.spec.ts` (`withItems(...ITEMS)`, which includes
   unplaced items, so the page has many placements), connect, choose Compact.
2. Scroll down to 400 px, wait, then scroll up to 100 px.
3. Sample, every animation frame, the header's height and width, `data-stuck`, the
   links' `nav` width and height, and a row's top.

**Expected**: the header is one size from the frame it lets go, and the row's top
moves only with the scroll.
**Actual**: three runs in three, and again on a fourth: one frame with `data-stuck`
gone shows the header 174 px tall and the links 864 px wide and 76 px tall (two rows, 901 px
of links in an 884 px list), then the next frame 125 px, 944 px and 37 px (one row). The
row's top moves 49 px down and back, with no scroll between. With the example's own
items the links never wrap (about 662 px) and the header is 134 then 125 px, the row 9 px
down and back; at 375×812 with the spec's items the header is 158 then 152 px, the row
6 px.

## Cause

Verified at `dfa924a` (agent, DEF-021 delivery). It is the global reduced-motion rule in
`src/styles/globals.css`, which gave every element `transition-duration: 0.01ms` while
`transition-property` stayed its initial `all`. When the header lets go, the classes that
drop its container's margins, its slim header's padding and border, and the title's size
change in one render, and each of those properties then runs a transition: Chromium draws
the old value for one or two frames before the 0.01ms one ends. Sampled each frame with
`data-stuck` already gone, the container still has 40 px of padding each side (`pad` 40 px,
`padding-left` and `padding-right` among `document.getAnimations()`), so its links are 864
px wide in 944, wrap onto a second row, and the header is 49 px taller; a frame or two
later the padding is 0 and it is 944 px and one row. The classes, `useScrolledPast` and
`useMeasuredHeight` are not late, and the current link's bold is not involved: the frame
sequence is the same with the DOM classes unchanged between frames. It does not happen
without the preference: with `reducedMotion: "no-preference"` the same scroll draws the
header at 125 px in its first frame. So the defect is the reduced-motion user's, and the
E2E harness's, not every Product Lead's.

- `rg -n 'transition' src/styles/globals.css` — the one rule, in the
  `prefers-reduced-motion` block.
- `rg -n 'stuck' src/components/layout/sticky-header.tsx` — the classes that change as
  the header lets go.

## Acceptance criteria

### S1: The header keeps one size as it lets go

**Given** a roadmap's page with its header stuck, at any width
**When** the page is scrolled up until the header lets go
**Then** the header, and the items below it, take no more than one size from the
frame it lets go

## Decisions

- **D1** (owner, 2026-11-19, triage in the orchestrator's session): fix, low priority,
  timeboxed — a visible jump on a screen Product Leads use constantly, and a hidden
  source of flaky E2E presses.
- **D2** (agent, 2026-11-19): the fix is in the global rule, not the header: under
  reduced motion no transition runs, which is what ADR-010 says ("stilled entirely")
  and the rule's own comment ("respect reduced motion everywhere"). Making the header
  alone immune would leave every other layout change under reduced motion drawing a
  frame at its old size. `animation-duration: 0.01ms` is left as it is: no animation
  was found to move layout, and Base UI waits on `getAnimations()`, which an animation
  still gives it.

## Delivery

The reduced-motion rule sets `transition: none` where it set `transition-duration:
0.01ms`, so no transition starts and an element takes its new size in the frame its
class changes. The header, its links and the items below it keep one size from the frame
the header lets go, at 375, 768 and 1280 px. The rule only applies to a user, or a test,
with `prefers-reduced-motion: reduce`; the record's reading that every Product Lead saw
the jump was wider than the cause (see Cause).

### Departures

- **Cause and reach narrower than the record's reading** (agent): the jump is the
  reduced-motion rule's, not the header's, so a user without the preference never saw
  it. The fix lives in `globals.css`, not `sticky-header.tsx` (D2).
- **No screenshots** (agent): the fix changes no settled screen; the header's stuck and
  in-page layouts are the same at every width, and a still image cannot show a frame
  that lasts one or two. The evidence is the per-frame sample below.
- **Guide and comment lines corrected** (agent): the line in `tests/e2e/AGENTS.md` that
  said transitions last 0.01ms and a class "arrives a frame late", and
  `useMeasuredHeight`'s comment saying a reduced-motion transition brings padding in
  late, described the old behaviour. Their rules (run a layout check with reduced
  motion; measure the border box) are unchanged.

### Contract for dependents

Under `prefers-reduced-motion: reduce` no CSS transition runs: a test with
`reducedMotion: "reduce"` reads an element's settled size from the frame its class
changes, with no wait. An element's `transitionend` never fires there, so no code may
wait on one. `focusClearOfBars` (`fixtures/roadmap-page.ts`) still reads until the bars
hold still, which is safe and was left as it is.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `tests/e2e/roadmap-header.spec.ts`, "letting go on a scroll up, with reduced motion (DEF-021 S1)", at 375, 768 and 1280 px: from the frame `data-stuck` goes, for up to 30 frames, the header's height and a row's top in the document each take one value. At `dfa924a`, with no load, it was red at all three: the header's heights `[158, 152]`, `[188, 161]` and `[134, 125]`. With the fix it is green, 150 of 150 with `--repeat-each=50 --workers=8`; the compact, header and placement-navigation specs together passed 860 of 860 with `--repeat-each=10`, and `pnpm test:e2e` passed 554 of 554. The test adds no CPU load; no slowed-CPU run was needed, since the red is not a flake. |
