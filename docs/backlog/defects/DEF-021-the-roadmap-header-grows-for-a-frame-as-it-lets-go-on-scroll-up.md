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
or two frames its placement links are drawn on two rows instead of one, so the header is
49 px taller and everything below it, the items included, sits 49 px lower. The next
frame it is back. At 1280 px, with the navigation open and the compact view showing, it
happens every time. `StickyHeader` says nothing below it moves as it sticks or lets go.
It made DEF-020's test press the wrong place, now and then.

## Reproduce

At commit `a6a9683` on the default branch, in the E2E harness (Google faked, Chromium,
1280×900, no load):

1. Open `./#/roadmaps/producta` with the example's items, connect, choose Compact.
2. Scroll down to 400 px, wait, then scroll up to 100 px.
3. Sample, every animation frame, the header's height, `data-stuck`, the placement links'
   `nav` height and a row's top.

**Expected**: the header is one height from the frame it lets go, and the row's top
moves only with the scroll.
**Actual**: three runs in three: one frame with `data-stuck` gone shows the header 174 px
and the links 76 px (two rows, the list 901 px of links in 884 px), then the next frame
125 px and 37 px (one row); the row's top moves 49 px down and back, with no scroll
between.

## Cause

Not verified. In the first frame the links add up to 901 px for a list 884 px wide, so
they wrap; the next frame fits them on one row. What differs between the two frames was
not measured. Suspected: the current link, which is bold (`PlacementLinks`), changes
with the scroll a frame after the header has let go; or the links are drawn before the
count or mark each carries.

- `rg -n 'PlacementLinks|usePlacementNavigation' src/features/roadmaps` — the links and
  the scroll-driven `current` they bold.

## Acceptance criteria

### S1: The header keeps one height as it lets go

**Given** a roadmap's page with its header stuck, at 1280 px beside the open navigation
**When** the page is scrolled up until the header lets go
**Then** the header, and the items below it, take no more than one height from the
frame it lets go

## Decisions
