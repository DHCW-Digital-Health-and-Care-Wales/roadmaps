# The shell's navigation: search, families that close, and a width to drag

- **Date**: 2026-11-18
- **Question**: how should the desktop navigation let a Product Lead find a roadmap
  among many, put away the families they don't lead, set its width, and see only the
  roadmaps with unpublished changes?
- **Scope**: the shell's navigation (`NavigationSidebar`, `RoadmapNavigation`,
  `NavigationDrawer`) on a desktop, folded to its rail, and as a phone's drawer. It comes
  from the owner's request of 2026-11-18, with no record yet. The owner asked for one
  design, so this analysis compares the design with today's navigation, not with other
  designs. Its three journey groups share one screen, so they share one section. Base
  `f46384c`. Only documents and one prototype page were added; no
  application code, and no correction to the skill's stylesheet or starter.
- **Prototypes**: one self-contained page, a **working component**,
  [`navigation-sidebar-ux-prototypes.html`](navigation-sidebar-ux-analysis/navigation-sidebar-ux-prototypes.html).
  The working component shape fits because each request is about how the navigation
  behaves under the hand: dragging, typing, pressing and folding. Its host is the whole
  shell, the navigation beside a page standing in for a roadmap's, at the window widths
  the app draws it at. The page's Screen switch sets the window: 375px and 1023px draw
  the drawer, 1024px and 1280px draw the navigation beside the page. Its Unpublished
  changes switch sets none, one or three roadmaps with changes.
- **Sample world**: invented. On 18 November 2026 a Product Lead is on Shared care
  plans. The list holds 14 roadmaps in five groups: Citizen Services 4 (Appointment
  booking, Ffôn Iechyd helpline, Patient messaging, Prescriptions online), Medicines &
  Diagnostics 3 (Electronic prescribing, Pathology results, Radiology requests), Single
  Record 3 (Care record viewer, Clinical notes, Shared care plans), Workforce 2
  (Rostering, Staff directory) and No product family 2 (Carers' register,
  Patient-reported outcome measures collection). Three roadmaps have unpublished
  changes: Electronic prescribing, Shared care plans and Carers' register; with the
  switch at "One roadmap", only Electronic prescribing. Planted: "care" is in two titles
  and inside "Carers"; "prescri" spans two families; "ffon" must find "Ffôn"; "single"
  and "record" name a family; Care record viewer and Carers' register share the rail's
  initials CR; one title wraps at the narrowest width.

## Readers and where they are

A Product Lead with about 30 minutes a week for roadmaps (persona A1), at a desk (A2),
moving between the roadmaps they lead. The navigation lists every roadmap in the
spreadsheet, not only theirs, so a Product Lead who leads two products in one family
scrolls past the others to reach them. They check what is waiting to publish before
they leave (A9, A10). On a phone (A2) the navigation is a drawer, opened from the top
bar or a roadmap's sticky strip (STY-054 D8, D9).

## Journeys covered

| Group                                     | Journeys                                                                                                                             | Story                       |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- |
| Find and reach a roadmap                  | search the roadmaps; close and open a family, or all of them; reach a roadmap; fold to the rail and search from it; the phone drawer | none yet; builds on STY-054 |
| See the roadmaps with unpublished changes | narrow the list to them and back; discard a change while narrowed; one roadmap left                                                  | none yet; builds on STY-055 |
| Set the navigation's width                | drag the edge; set it by keyboard; reset it; at the laptop's 1024px                                                                  | none yet; builds on STY-054 |

Each relies on the persona's A1 (short visits) and A2 (desktop first, phone second); the
second relies on A9 and A10 too (nothing public until published).

Excluded: the navigation before connecting or with a list that failed (STY-054 S4,
STY-055 D6), which keeps its own entries and draws no roadmaps to search; the Welsh
interface; the pinned foot bar and the cards' columns, which follow
`--navigation-width` today and would follow a dragged width.

## What every design shares

- The navigation's entries and order are today's (STY-054 D3, D4): All roadmaps, the
  count of unpublished changes, each family's roadmaps with their colours and dots, then
  Families, categories and organisations. The current page is marked, the rail shows
  initials with their names in a tooltip, and a phone draws the same entries in a
  drawer.
- **The search** compares without case or accents ("ffon" finds "Ffôn") and finds a
  roadmap by its title or by its family's name ("single" finds all of Single Record).
  It underlines the part of a title it matched. All roadmaps and Families, categories
  and organisations always show. Nothing found says "No roadmaps match" with the text
  typed.
- **Narrowed**, by a search or by the count, a family with nothing to show is left out,
  and a closed family shows what it holds. Its name is then a plain heading; the families
  closed before come back closed when the list is whole again.
- **The count of unpublished changes**: with none, it does not show (STY-055 S3); with
  one, it leads to that roadmap, or is text on its own page, as today (STY-055 D5, D6).
  With two or more, it is a button that narrows the list to them, pressed while it
  does. Pressing it clears the search, and pressing it again shows every roadmap
  without bringing the search back. Typing in the search lets the count go; a blank
  search does not. Fewer than two left ends the narrowing. The rail's circle opens the
  navigation narrowed, and the drawer's count leaves the desktop's fold alone.
- **What is remembered on this device**, as the fold is today (STY-054 D5): the width
  and the closed families. The search and the narrowing last while the Product Lead
  moves between pages, and not past a reload.
- **The width** runs from 208px to 400px, starting at today's 256px.
- **Close all** closes every family, the current roadmap's too, and becomes **Open
  all** once all are closed. Focus stays on it as its words change.
- **Choosing a roadmap opens its family**, and so does arriving on its page by an
  address or a reload, so the current page is never hidden by a choice made elsewhere.
- **The drawer opens on Close menu**, so a phone's keyboard stays shut until the
  Product Lead chooses the search.
- **What a screen reader is told**, in the shell's live region: how many roadmaps match
  once typing pauses; "Showing the 3 roadmaps with unpublished changes" and "Showing all
  roadmaps" as the count is pressed; "All families closed" and "All families open"; the
  count's own change as today (STY-055 S4).
- The app's look: its input, header icon buttons, navy navigation, yellow focus and
  dots, light and dark.
- Nothing here is written to the data source; the public site sees no change.

## Find, narrow and size the navigation

The Product Lead switches roadmaps from a list of every roadmap, grouped by family.
With 14 roadmaps the list already passes a laptop's height; with the 29 of the page
headers analysis's world, most families sit below the fold. The count of unpublished
changes leads to one roadmap at a time (STY-055 D5), so seeing which roadmaps are
waiting means reading the dots down the whole list.

| Design                                  | Idea                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Strengths                                                                                                                                                                                                                                                                                                                                                                  | Risks                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Today                                   | Every roadmap, every family open, at a fixed 256px; the fold button alone on the top row; the count leads to the next roadmap with changes, in turn.                                                                                                                                                                                                                                                                                                                         | Nothing to learn. Every roadmap is one press away, and the order never changes.                                                                                                                                                                                                                                                                                            | A long list to scan and scroll on every switch; long titles wrap at 256px; which roadmaps wait to publish is read from dots, one at a time.                                                                                                                                                                                                                                                                                                                                                                                                   |
| A. Search, families and a width to drag | A search box tops the navigation, with the fold button to its right; folded, it is a spyglass that opens the navigation ready to type. Each family's name is a button with a chevron at its end, down while open and right while closed; above the first, "Close all" closes every family, and "Open all" opens them once all are closed. The right edge drags, and by keyboard is a window splitter. With two or more roadmaps changed, the count narrows the list to them. | A roadmap is a few letters away; families the Product Lead doesn't lead fold away and stay folded on this device. The count shows every roadmap waiting at once, and its dots and the pressed state say why the list is short. Long titles get room. The search row stays put as the list scrolls. On a phone the drawer keeps the count, the search and Close on one row. | Four new controls in a narrow column. A closed family can hide where the Product Lead is going, so choosing a roadmap opens its family. The count changes kind at two (a link with one, a button with more), which a screen reader user may notice. The rail ignores the search and the narrowing, and shows no scrollbar, so only its cut-off last mark says it scrolls. The drag is drawn by hand here; built, it would come from a library or Base UI's own, and feel different. Dragging on a touch screen at 1024px or wider is untried. |

**Recommendation**: design A, as the owner asked for it, with decisions 1 to 19 below
settled first. Decisions 6 (what the search compares) and 9 (the count with one roadmap)
change the most if answered the other way.

## Decisions needed

Each row is a rule the prototype chose where the request was silent, or an earlier
decision it reopens. No record holds open questions on this yet.

| #   | Decision                                                                                                                                                                                                                                                                                                                                                                    | Options                                                                                                                                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Where the work goes: no epic or story holds it.                                                                                                                                                                                                                                                                                                                             | (a) a new epic of three stories (search; families that close; width), with the count's narrowing in the search story; (b) one story; (c) one story per bullet of the request          |
| 2   | The family's icon: the request says it "changes depending on whether the nav is open or closed". The prototype reads that as the family open or closed.                                                                                                                                                                                                                     | (a) chevron down while open, right while closed, as drawn; (b) chevron up while open, down while closed; (c) the icon follows the navigation's fold, as the words could also mean     |
| 3   | What the family's button is: the prototype makes the whole name the button, its chevron at the end.                                                                                                                                                                                                                                                                         | (a) the whole name, as drawn; (b) the chevron alone, the name a heading                                                                                                               |
| 4   | Whether closed families and the width are remembered.                                                                                                                                                                                                                                                                                                                       | (a) on this device, as the fold is (STY-054 D5), as drawn; (b) for the visit only                                                                                                     |
| 5   | A closed family holding a roadmap with changes.                                                                                                                                                                                                                                                                                                                             | (a) keeps a dot on its name, read as "unpublished changes", as drawn; (b) nothing                                                                                                     |
| 6   | What the search compares.                                                                                                                                                                                                                                                                                                                                                   | (a) the title and the family's name, without case or accents, as drawn; (b) the title alone; (c) both languages' titles, so a Welsh title is found from the English interface         |
| 7   | A search with a closed family.                                                                                                                                                                                                                                                                                                                                              | (a) finds roadmaps in closed families, which come back closed once cleared, as drawn; (b) searches open families only                                                                 |
| 8   | The search and the count together.                                                                                                                                                                                                                                                                                                                                          | (a) typing lets the count go, as drawn; (b) the search narrows within the roadmaps with changes                                                                                       |
| 9   | The count with one roadmap: the request covers two or more. Reopens STY-055 D5 for two or more, where the count led to each roadmap in turn.                                                                                                                                                                                                                                | (a) one: a link to it, as today, as drawn; (b) one: a button too, showing just that roadmap                                                                                           |
| 10  | The narrowing when fewer than two roadmaps are left with changes.                                                                                                                                                                                                                                                                                                           | (a) it ends, as drawn; (b) it stays until pressed again, showing one or none                                                                                                          |
| 11  | What lasts: the prototype keeps the search and the narrowing across pages, not past a reload; on a phone, choosing a roadmap closes the drawer and keeps the search for the next time it opens.                                                                                                                                                                             | (a) as drawn; (b) clear both on every page move                                                                                                                                       |
| 12  | The rail: it lists every roadmap, without the search, the narrowing or the closed families. Its spyglass opens the navigation, remembered as open, with the search focused; its count's circle opens it narrowed.                                                                                                                                                           | (a) as drawn; (b) the rail shows what the open navigation shows; (c) the spyglass opens the navigation for the search only, folding again once a roadmap is chosen                    |
| 13  | The width: 208px to 400px, 256px to start; a double-click on the edge resets it; arrows move it 16px, Home and End to its limits; it is the navigation's last Tab stop.                                                                                                                                                                                                     | (a) as drawn; (b) dragging below the narrowest folds to the rail; (c) a widest that follows the window, so a laptop keeps more of its page                                            |
| 14  | The phone drawer: its top row holds the search and Close menu, so "Menu" names the drawer for a screen reader and no longer shows. Changes STY-054 S5's drawer.                                                                                                                                                                                                             | (a) as drawn; (b) "Menu" and Close on their row, the search under them                                                                                                                |
| 15  | The top row stays in place as the list scrolls, inside the navigation's landmark. Today the fold button scrolls away with the list, outside the landmark.                                                                                                                                                                                                                   | (a) as drawn; (b) as today                                                                                                                                                            |
| 16  | Close all and Open all (added at the owner's request; the placement was left to the agent): one button, "Close all" while any family is open and "Open all" once all are closed, at the end of its own row above the first family. It shows only while the families are listed whole, so not while narrowed or in the rail, and it closes the current roadmap's family too. | (a) as drawn; (b) in the top row beside the search, which leaves the search too narrow at 208px; (c) two buttons, both always shown; (d) closing all but the current roadmap's family |
| 17  | The rail shows no scrollbar (at the owner's request) and still scrolls by wheel, touch and focus. The open navigation and the drawer keep theirs.                                                                                                                                                                                                                           | (a) as drawn; (b) no scrollbar in the open navigation either                                                                                                                          |
| 18  | The drawer opens with focus on Close menu (added in review), not on the search, its first control, which would open a phone's keyboard on every visit.                                                                                                                                                                                                                      | (a) as drawn; (b) on the search                                                                                                                                                       |
| 19  | The count's edges (added in review): the rail's circle opens the navigation narrowed whether or not the count was pressed, and carries no pressed state; the drawer's count leaves the desktop's fold alone; a blank search neither lets the count go nor announces anything.                                                                                               | (a) as drawn; (b) the circle toggles as the count does                                                                                                                                |

## Outcome

On 2026-11-18 the owner chose the chevrons as drawn (decision 2 (a)), accepted the
count's change to STY-055 D5 (decision 9), and asked for the prototype to be delivered
as drawn. The agent took option (a) of every other decision but the first, as the
prototype draws it. For decision 1 the agent made
[EPC-014 A navigation that scales](../backlog/EPC-014-a-navigation-that-scales/README.md)
of four stories, departing from (a) by giving the count's narrowing a story of its own,
since it reopens STY-055 D5 and depends on both the search and closed families:

| Decisions                 | Record                                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 6, 11, 12, 14, 15, 17, 18 | [STY-061](../backlog/_archive/EPC-014-a-navigation-that-scales/STY-061-find-a-roadmap-by-searching-the-navigation.md) |
| 2, 3, 4, 5, 7, 16         | [STY-062](../backlog/_archive/EPC-014-a-navigation-that-scales/STY-062-close-the-families-they-dont-need.md)          |
| 8, 9, 10, 11, 12, 19      | [STY-063](../backlog/EPC-014-a-navigation-that-scales/STY-063-show-only-the-roadmaps-with-unpublished-changes.md)     |
| 4 (the width), 13         | [STY-064](../backlog/EPC-014-a-navigation-that-scales/STY-064-drag-the-navigation-to-the-width-they-want.md)          |

_Not yet drawn_ is written into the stories' scenarios: Welsh (each story's last
scenario), the navigation before the roadmaps are read (STY-061 S11), the drawer as a
dialog (STY-061 S10, unchanged from STY-054 S5), the pinned bars following the width
(STY-064 S1, S7), a touch screen 1024px or wider (STY-064 S8). A shortcut to the search
stays out of scope.

## Not yet drawn

- Welsh: the search's placeholder and the count's button at 208px in Cymraeg, and Welsh
  titles found from it (decision 6).
- The navigation before connecting or with a list that failed (STY-054 S4): whether the
  search shows with no roadmaps to search.
- The drawer as a dialog: the prototype neither traps nor returns focus; the app does
  (STY-054 S5).
- The roadmap's sticky strip and its menu button (STY-054 D8), and the pinned foot bar
  and card columns following a dragged width.
- A tablet wider than 1024px worked by touch, where the edge is the only way to set the
  width without a keyboard.
- A shortcut to the search, such as "/", which the request does not ask for.

## What does not change

- The roadmaps, their order, colours, dots and initials, and the families' order
  (STY-054 D3, STY-055 D1, D3).
- The current page's mark, focus moving to the page on a choice (STY-054 S1, S3), and
  pending changes kept across pages (STY-054 S6).
- The fold to a rail and its remembering, its icons (STY-054 D5, D10, D11), and the
  drawer below 1024px.
- The count's text, its absence with nothing pending (STY-055 S3), the menu button's dot
  on a phone (STY-055 D4), and what the shell announces of the count (STY-055 S4).
- Nothing new is read or written: the data source and the public site are untouched.
  The width and closed families join the fold in this device's storage.

## Related

- [STY-054: move between roadmaps from the shell](../backlog/_archive/EPC-012-app-shell-and-navigation/STY-054-move-between-roadmaps-from-the-shell.md)
- [STY-055: see unpublished changes across roadmaps](../backlog/_archive/EPC-012-app-shell-and-navigation/STY-055-see-unpublished-changes-across-roadmaps.md)
- [Roadmap page shell UX analysis](roadmap-page-shell-ux-analysis.md), which chose the
  dashboard shell
- [Page headers UX analysis](page-headers-ux-analysis.md), whose world has 29 roadmaps
- [ADR-010: align the UI with the DHCW design system](../adr/ADR-010-align-the-ui-with-the-dhcw-design-system.md)
