# DEF-021: The roadmap header grows for a frame as it lets go on scroll up, moving the items

- **Status**: Needs triage — found by DEF-020 delivery
- **Severity**: Low — the items below the header jump 49 px for a frame or two as it
  lets go; nothing is lost, and a press that lands in that frame misses its target
- **Area**: Features/UI
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Sonnet — a layout trace of one frame, then a fix in the header or
  its links
- **Delivered**: _(add on delivery)_

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

Not verified. What was measured: in the frame after `data-stuck` goes, the in-flow
header's links are 864 px wide, 80 px short of the 944 px they have a frame later, and
the settled width is the same before and after, so something that gives the width, or
takes 80 px of it, arrives a frame late. 80 px is the container's two margins
(`md:px-10` in `PageContainer`), so a suspect is the class that drops them while the
header is in the page (`StickyHeader`), not the links' own text; a row of links as long
as the spec's merely makes the narrower frame visible by wrapping. Not told apart from
the links' current, bold link changing a frame late.

- `rg -n 'PageContainer|max-w-none' src/components/layout/sticky-header.tsx` — the
  container whose margins differ between stuck and in the page.
- `rg -n 'PlacementLinks|usePlacementNavigation' src/features/roadmaps` — the links.

## Acceptance criteria

### S1: The header keeps one size as it lets go

**Given** a roadmap's page with its header stuck, at any width
**When** the page is scrolled up until the header lets go
**Then** the header, and the items below it, take no more than one size from the
frame it lets go

## Decisions
