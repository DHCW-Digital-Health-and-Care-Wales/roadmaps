# STY-059: A Product Lead opens a roadmap on one header block

- **Status**: Done — a roadmap's page opens on one header block: title, facts, the Not
  published row, About this roadmap with Edit, then Add an item, More and "Jump to"
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: [EPC-013-tidy-page-tops](README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-010, ADR-008, ADR-012
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/156
- **Suggested model**: Opus — it restructures the top of a roadmap's page around the
  sticky title row, About's editing and pending marks, and Publish roadmap

## Summary

A roadmap's page opens on a back link, the title, its controls, then a boxed About
holding the status, product lead and last update, with Show more and Edit on its edge.
This story makes the top one block on one left edge: the title, its facts, the Not
published tag with Publish roadmap beside it when it is not published, then an About
this roadmap disclosure with Edit beside it, then the row of controls (Add an item,
More, the jump control) in that order. The back link goes. The stuck strip and the
jump control's form per width are STY-060's; they keep working here.

## Acceptance criteria

### S1: One header block on one left edge

**Given** Demographics and Identity (MPI, WDS, WAMS), published, status label Live, led
by Sam Evans & Rhian Morgan, updated 4 November 2026
**When** the Product Lead opens it on a phone, an iPad or a desktop
**Then** they see, top to bottom on one left edge: the title; "Status: [Live]",
"Product lead: Sam Evans & Rhian Morgan" and "Updated 4 November 2026"; the About this
roadmap disclosure, closed, with Edit beside it; then Add an item, More and the jump
control
**And** there is no "Back to roadmaps" link

### S2: The facts

**Given** a roadmap's page
**When** it opens
**Then** its facts are a list named "Roadmap details", each fact only when the roadmap
has it: on a phone one fact to a row, from 640px on one line, wrapping between facts
**And** the status label reads "Status:" then its tag, so it is not mistaken for the
service's Beta banner

### S3: The title

**Given** a roadmap whose title wraps
**When** it opens
**Then** on a phone the title is in the large heading size (`text-heading-l`), and from
640px in today's size, running to the content's width

### S4: About this roadmap opens in place

**Given** the About this roadmap disclosure, closed
**When** the Product Lead presses it
**Then** it expands in place to show the vision, the service description, the family
(with its colour) and the category, and reads as expanded to a screen reader
**And** it is a text control at least 44px tall with a chevron, underlined on hover,
and its Edit is a 40px button that opens About's editing as today

### S5: A pending change to About still shows

**Given** About with a pending change
**When** the page opens
**Then** About's Changed tag shows beside the disclosure, closed or open, and "Undo
changes" shows once it is open, as today

### S6: A roadmap not yet published

**Given** Community Nursing, not published, status label Beta
**When** the Product Lead opens it
**Then** under its facts a row holds the Not published tag and a visible Publish
roadmap button, 40px tall, before the About disclosure
**And** Publish roadmap no longer sits among the title row's controls; once the strip
sticks, More holds it, at every width
**And** pressing it publishes the roadmap as today, its outcome at the foot (STY-052)

### S7: One row of controls in one order

**Given** a roadmap's page, at the top
**When** the Product Lead reaches its controls
**Then** they are Add an item, More, then the jump control, in that order, and Tab
reaches them in that order after Edit
**And** none is wider than its label, and once the strip sticks it holds them in the
same order

### S8: Welsh, keyboard and the first screen

**Given** the page in Cymraeg at 375px, 820px and 1280px, or a keyboard alone
**When** the Product Lead uses the header block
**Then** nothing scrolls sideways or passes the right edge, every control is reached
and named, and the first placement still starts on the first screen at 1280×800
(STY-053 S6)

## Decisions

- **D1** (owner, 2026-11-18, page headers UX analysis decision 1 (a)): design G, as
  drawn in the analysis's prototype.
- **D2** (owner, 2026-11-18, analysis decision 3 (a)): status, product lead and last
  update sit under the title; About this roadmap (vision, service description, family
  and category) is a disclosure beside its Edit. Changes STY-053 D2 and D6, and S6's
  one-line summary.
- **D3** (owner, 2026-11-18, analysis decision 5 (a)): no back link on any width.
- **D4** (owner, 2026-11-18, analysis decision 6 (a)): Publish roadmap sits beside the
  Not published tag, under the facts. Changes STY-052 D15 and D19.
- **D5** (owner, 2026-11-18, analysis decisions 10 (a) and 11 (a)): a phone title in
  `text-heading-l`; the status label reads "Status: [Live]" (Cymraeg "Statws").
- **D6** (owner, 2026-11-18, accepting the analysis's _Not yet drawn_): Edit and
  Publish roadmap are 40px; the title runs to the content's width; the disclosure is
  underlined on hover; the facts list is named "Roadmap details", not the disclosure's
  name.
- **D7** (agent, 2026-11-18): once the strip sticks, More holds Publish roadmap at every
  width, as STY-052 D19 had it on a phone, so the strip keeps one set of controls
  (epic _Design_ 4); left visible on a desktop, it would add a control G does not draw.

## Starting point

Audited at `0f7b22c`. `RoadmapTitleRow` holds the title and the controls in one element
that sticks and slims (STY-052 D5), with the jump control in a slot (STY-053's
_Contract for dependents_); `EditableRoadmapAbout` holds the folded About with the
facts on its line. The facts are shared with the list's card as `roadmaps.facts.*`.

## Out of scope

- The stuck strip's rows per width, the jump control's form per width, and the foot
  bar: STY-060. Until it lands the strip keeps today's form, with the controls in S7's
  order.
- The roadmap list and the families page: STY-058.

## Delivery

### Departures

- **About is a heading holding its disclosure** (agent, S4): the disclosure is a text
  button inside an `h2` "About this roadmap", in a region of that name, as the WAI-ARIA
  accordion has it, so heading navigation still reaches About and the region holds its
  Changed tag, "Undo changes" and Edit.
- **Stuck, the facts, the Publish row and About are visually hidden, not removed**
  (agent, S6, S8, D7): the strip shows only the title and the controls, as today, but a
  keyboard or screen reader that reaches one of them from after it (Shift+Tab from Add
  an item, say) scrolls the page back to the header's place, so the block lets go and
  shows it there; Tab from before it (the strip's menu button) passes it by, on to Add
  an item, the strip staying stuck. Hidden outright, About's Edit could not be reached
  until the page was scrolled up.
- **A roadmap with no date shows no "Updated" fact** (agent, S2): the facts show each
  only when the roadmap has it, so STY-036 S1's "No date" in the open About goes with
  About's date field (STY-036 D12 records it). The roadmap dialog still edits the date.
- **"Jump to" keeps today's width per width** (agent, S7, _Out of scope_): a full row
  below 1024px and its label's width from 1024px, and the row of placement links stays
  under the header block; STY-060 shapes both. "None wider than its label" holds for
  Add an item and More.
- **Publish roadmap wraps under its tag in Cymraeg on a phone** (agent, S6, S8): "Heb ei
  gyhoeddi" and "Cyhoeddi'r map trywydd" do not fit one 375px row; the button wraps to
  the tag's left edge, nothing passing the right edge.
- **The out-of-step badge and the title's Changed tag stay beside the title** (agent,
  S1): only the Not published tag moves, to the Publish row.
- **Renames and removals**: `RoadmapTitleRow` is `RoadmapHeader`
  (`components/roadmap-header.tsx`); `BackLink` is gone, unused; the quality-review
  skill's example of a layout piece names `StickyHeader` in its place.

### Contract for dependents

- **`RoadmapHeader`** renders the block in one `StickyHeader`: the title row, a middle
  part (`RoadmapFacts`, the Not published row, the `about` slot) and the controls row,
  Add an item, More, then `jumpTo` from 1024px, with `jumpTo` in a row of its own below.
  Stuck, the middle part takes `sr-only` and `LEFT_OUT` (`components/layout/left-out.ts`);
  STY-060 reshapes the stuck strip around the same three parts.
- **`StickyHeader`**, while stuck, asks `leftOutFocus` (`left-out.ts`) where focus that
  lands in a `LEFT_OUT` part goes: from after it or from nowhere, it scrolls back to its
  place; from before it, focus goes on to the control past the part.
- **More** holds "Publish roadmap" only once stuck, and "Unpublish roadmap" always, for a
  published roadmap.
- **`EditControls`** takes `size` (`sm` by default; About's are 40px).
- **Catalogue**: `roadmaps.facts.name` ("Roadmap details", "Manylion y map trywydd") and
  `roadmaps.facts.status` ("Status:", "Statws:") are new; `roadmaps.about.showMore`,
  `showLess`, `noDate` and `about.fields.statusLabel`, `productLead` and `lastUpdated` are
  gone, in both languages. `roadmaps.detail.back` stays: the not-found panel's link.
- **Test hooks**: `goToList` (both `testing/roadmap-page.ts` and
  `tests/e2e/fixtures/roadmap-page.ts`) goes back to the list by the header's home link;
  `openAbout` presses the disclosure; `roadmapFacts` finds the facts;
  `openEditRoadmapDialog` (E2E) scrolls to the top first; `shownInStuckRow` and
  `namesShownInStuckRow` (E2E) find the buttons the stuck row shows.
- **Data source**: nothing written changes.

### Scenario evidence

`hp` is `src/features/roadmaps/pages/roadmap-detail-page-header.test.tsx`; `e2e` names a
spec in `tests/e2e/`.

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                          |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `hp` "opens on the title, its facts, About with Edit, then Add an item, More and Jump to, with no link back"; e2e `roadmap-header.spec.ts` "opens on one header block on one left edge…" at 375, 820 and 1280px; `structure.spec.ts` `detail`                                                                                                                    |
| S2       | `roadmap-facts.test.tsx` (the list's name, "Status:" then its tag, each fact only when present, its classes per width, Welsh); e2e `roadmap-header.spec.ts` (one fact to a row below 640px, one line from it)                                                                                                                                                    |
| S3       | `hp` "shows the title in the large heading size on a phone…"; e2e `roadmap-header.spec.ts` "shows the title in the large heading size on a phone, and today's from 640px"                                                                                                                                                                                        |
| S4       | `roadmap-about.test.tsx` (closed, a heading holding the disclosure; expands in place, `aria-expanded`; 44px text control, underlined on hover; fields); e2e `roadmap-page.spec.ts` "About opens in place under a rule, with a 40px Edit…"                                                                                                                        |
| S5       | `roadmap-about.test.tsx` "tags a pending change beside the disclosure while closed…"; e2e `roadmap-page.spec.ts` "About holds “Changed” beside its disclosure, closed or open, and “Undo changes” once open…"                                                                                                                                                    |
| S6       | `hp` "puts the Not published tag and a 40px Publish roadmap under the facts…" and "holds Unpublish roadmap in More…"; e2e `roadmap-header.spec.ts` "shows Not published and Publish roadmap under the facts…"; `roadmap-controls.spec.ts` "moves Publish roadmap into More once the row sticks, at every width…"; `publishing-roadmap.spec.ts` publishes from it |
| S7       | `hp` "reaches Add an item, More and Jump to by Tab after Edit…"; e2e `roadmap-header.spec.ts` (order and Tab after Edit at each width; "tabs on from the stuck row's menu button to Add an item…"); `left-out.test.ts`; `placement-navigation.spec.ts` "keeps every control of the stuck row on screen…"                                                         |
| S8       | e2e `roadmap-header.spec.ts` in Cymraeg at 375, 820 and 1280px (no sideways scroll, nothing past the right edge) and "reaches About's Edit by Shift+Tab from the stuck row…"; `placement-navigation.spec.ts` "keeps About closed, so the first placement starts on the first screen at 1280×800"                                                                 |

Every test above followed working code. Each was shown red by breaking it: Add an item
after More, Publish roadmap back in More and the phone title at today's size (four `hp`
tests); the Changed tag shown open and a field key renamed (three About tests); the
"Status:" label dropped (three facts tests); and `StickyHeader`'s scroll back removed
(the Shift+Tab spec, the strip staying stuck); and the pass-by on Tab from before
removed (the menu-button spec, focus left on the hidden part).
