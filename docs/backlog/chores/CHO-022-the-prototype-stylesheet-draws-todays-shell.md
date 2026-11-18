# CHO-022: The prototype stylesheet draws a roadmap's page in today's shell

- **Status**: Proposed — three prototype pages have redrawn the shell in their own
  styles; the skill's stylesheet still draws the app before EPC-012
- **Type**: Chore
- **Area**: Docs
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: ADR-010
- **Suggested model**: Sonnet — a stylesheet and two guide lines, checked against
  captures of the app

## Summary

`ux-prototypes` tells an author to draw today's screen first with
`.agents/skills/ux-prototypes/assets/mock.css` and to correct the stylesheet where the
app has moved on, so the next prototype starts from the app as it is. Since EPC-012
the app's desktop has a navigation beside the page, a header that sticks and a foot
bar that pins, and `mock.css` draws none of them. Each prototype page that shows
the shell has redrawn it in its own styles instead. Those styles are committed only
inside each assembled page, mixed with its designs' own, so the next author picks
them out of a page or starts again from captures. Done looks like: a roadmap's page, at
the top and once scrolled, drawn from `mock.css` alone and matching captures of the
app at 1280px and 375px, and `references/frames.md` naming the frame that holds it.

## Measurement

At `1af519f`, comparing `mock.css` with captures of the app (Product A, Google faked,
1280px and 375px) and with the styles the compact view page carries: the `<style>` block of
`docs/analysis/roadmap-compact-view-ux-analysis/roadmap-compact-view-ux-prototypes.html`,
from `.frame .dk` on, which is where to start.

| Area                               | Measurement                                                                                                                                                                                                           | Verdict                                         |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| The desktop frame                  | `.dev` is 1060px wide with no navigation; the app at 1280px draws a 256px navigation and a 1024px page                                                                                                                | Add a frame with the navigation, open           |
| The header band                    | `.hdr` is 64px tall; the app's is 82px at 1280px and about 64px on a phone, with the logo, the language button and the account button                                                                                 | Correct, with its controls                      |
| The navigation                     | Not drawn: search, fold button, All roadmaps, the count of unpublished changes, Close all, families that close, roadmaps with their colours and dots                                                                  | Add                                             |
| The top of a roadmap's page        | Not drawn: the title's row with Add an item and More, the line of facts ending in "Product details", the placement links and "Jump to", and the header once stuck, on a desktop and on a phone                        | Add                                             |
| The phase banner                   | `.phase` has 10px of padding and no way to dismiss it; the app's has 6px and a ✕                                                                                                                                      | Correct                                         |
| The pinned foot bar                | `.pend` draws a bar above the page, as before STY-052; the app pins it to the foot of the screen                                                                                                                      | Replace                                         |
| Small buttons                      | `.btn.sm` has an 8px gap, 12px of padding and a 16px icon; the app's has a 6px gap, 8px of padding on an icon's side and a 14px icon, so a card's Changed tag and its three buttons wrap where the app's fit one line | Correct                                         |
| Pages that carried their own shell | The page headers, navigation and compact view analyses, all on 18 November 2026                                                                                                                                       | Recurs with every prototype of a roadmap's page |
| Comments                           | `mock.css` names a panel "About this roadmap", which the app now calls "Product details"                                                                                                                              | Correct                                         |
| `assets/component-page.html`       | Not compared                                                                                                                                                                                                          | Compare its header and buttons too              |

## Acceptance criteria

### S1: Today's roadmap page is drawn from the skill's stylesheet alone

**Given** a fragment that draws a roadmap's page, at the top and once scrolled, at a
desktop and a phone, with no styles of its own
**When** it is assembled and set beside captures of the app at 1280px and 375px
**Then** the navigation, the header band, the header block, the stuck header, the
placement links and the pinned foot bar match the captures in size and place
**And** `references/frames.md` names the desktop frame that has the navigation
**And** the skill's script tests pass

## Decisions

## Out of scope

- Redrawing committed prototype pages: each is self-contained and keeps its styles.
- The roadmap list, the families page and the dialogs, unless a capture shows them
  wrong.
