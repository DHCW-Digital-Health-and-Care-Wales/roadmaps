# STY-015: Shared components look like DHCW's

- **Status**: Done — delivered in its PR, which awaits merge
- **Type**: Feature
- **Area**: Features/UI
- **Epic**: EPC-003-dhcw-design-alignment
- **Depends on**: STY-014 (hard)
- **Binding ADRs**: ADR-010, ADR-005, ADR-009 §"Which roadmaps, in what order"
- **Suggested model**: Sonnet — restyling on settled tokens, with screenshots
- **Delivered**: _(PR URL, added when the PR is open)_

## Summary

Buttons, status tags, notices, roadmap cards, empty and error panels, menus and toasts
look like their DHCW counterparts, sized for a dense staff tool:

- bold buttons with DHCW's bottom shadow;
- square cards whose title is an underlined link;
- tags for statuses;
- DHCW-style info, success, warning and error notices.

New shared pieces (inset text, a context chip, a back link) are ready for the shell.
Features use these variants instead of hand-styling. Not in it: the header, footer,
logo and page layouts (STY-016).

## Scope

`components/ui` (variant restyles, plus any CLI-added components), new shared
components, and their adoption in `features/roadmaps`, `features/auth` and
`features/home`. Every value comes from tokens, and STY-014's lint rules pass with no
new exceptions.

## Acceptance criteria

### S1: Buttons follow DHCW

**Given** every button variant and size
**When** it is shown at rest, hovered, pressed, focused and disabled, in both themes
**Then** it matches DHCW's look:

- the primary is navy with a 2px shadow; the secondary is white, grey-bordered, with
  the shadow;
- the warning button is solid red;
- text is bold; corners are 4px;
- disabled is half opacity with no shadow.

**And** the default height is 40px and the small one 32px, and a group never mixes
sizes

### S2: Statuses are DHCW tags

**Given** a roadmap card's status label and "Not published" badge, and the header's
connection status
**When** they are shown
**Then** each is a square DHCW tag (14px bold, a 1px border in its ink colour) from the
neutral, info, success, warning, danger or outline variant
**And** each always carries text, never looks clickable, and every connection state maps
to one variant in a single typed table

### S3: Notices are DHCW callouts

**Given** a failed load, a failed refresh with cards shown, an expired session and an
auth failure on the start page
**When** each is shown
**Then** it uses an alert variant matching DHCW's callouts:

- `destructive` for a failure with nothing loaded;
- `warning` (DHCW's warning callout) for stale or expired data;
- `info` and `success` from the notification banner.

**And** roles, titles and actions are unchanged, and no feature hand-styles a notice

### S4: Roadmap cards are DHCW clickable cards

**Given** the example roadmaps
**When** the main page is shown, and a card is hovered and focused
**Then** each card is a square, white, bordered DHCW card with an underlined link-colour
title, a trailing chevron and a 4px grey bottom bar at rest (DHCW's clickable card)

- on hover, its border darkens to the secondary border colour;
- on focus, it shows `focus-ring`.

**And** the decorative swatch, the link's name and description, the two-line title and
three-line summary are unchanged, and grid gaps follow DHCW's 16/20px gutter

### S5: New shared pieces exist for the shell

**Given** the new components
**When** they render in a component test
**Then**:

- the inset text is a block with a thick left border;
- the chip is a bordered 40px item with a link-blue (`--link`) icon square, as DHCW's
  dashboard chip, whose icon is hidden from assistive tech;
- the back link is a link, not `role=button`, with a left chevron.

### S6: Panels, menus, skeletons and toasts match

**Given** the empty state, the not-found panel, the language menu open, the loading
skeletons and a toast
**When** each is shown in both themes
**Then** they use DHCW's square or 4px corners and tokens only; the menu's highlighted
item uses the muted surface and its keyboard focus `focus-fill`

### S7: Every list state still works, in both languages

**Given** loading, empty, a failed load, a failed refresh with cards shown and an expired
session, in English and Cymraeg
**When** the main page is shown at 1280px and 375px
**Then** each behaves as before, axe passes in both themes, and nothing scrolls
horizontally at 375px

## Decisions

- **D1** (owner, 2026-11-10, analysis decision 7): restyle to DHCW components as
  recommended.
- **D2** (agent, 2026-11-10): restyle `badge.tsx` into the tag rather than hand-writing a
  competing `Tag` (AGENTS.md: never hand-roll a primitive). Use the CLI for any new
  primitive.
- **D3** (agent, 2026-11-10): the card title is an underlined link, as in DHCW's
  clickable card, over plain text. It signals the card is clickable, and the stretched
  link already makes the whole card the target.
- **D4** (agent, 2026-11-10): `RoadmapIcon`'s indigo tile goes. If the detail page's
  header reads worse without an icon, use a neutral glyph; record which. **Settled
  (2026-11-10): no icon.** The detail header is the title and one line under it, which
  reads better flush left under the back link than beside a tile; the cards carry the
  swatch for identity. `RoadmapIcon` is deleted.
- **D5** (agent, 2026-11-10, from STY-013's delivery): STY-013 S4 gives menu items
  `focus-ring` (a 3px yellow outline outside a dark inner ring), and that is what
  `ui/dropdown-menu.tsx` has; S6 here asks for `focus-fill`. Settle it when restyling the
  menu: switch the items to `focus-fill`, or keep the ring and record why. **Settled
  (2026-11-10): `focus-fill`.** The pointer highlights an item with the muted surface
  (Base UI moves focus there, so `focus:bg-accent`); the keyboard fills it yellow, as a DHCW
  link or button, so a menu item never looks different from the link or button beside it.
  The ring stays for cards and toasts. `focus-indicator.spec.ts` asserts the fill on the
  menu item.

## Starting point

Audited at `22c3336`.

- **The card** is a `div` holding a stretched title `Link` (`after:absolute
after:inset-0`). Focus shows on the card through `has-focus-visible`. The link's
  `aria-describedby` lists only the parts present.
- **Tag colours.** The card's status uses `Badge variant="secondary"` and "Not
  published" uses `variant="outline"`. STY-012 S4 requires the badge to be distinct
  from the status. Keep the status label neutral: it is free text from the data source,
  not a fixed set.
- **The alert icon.** shadcn's `Alert` forces icon colour with `*:[svg]:text-current`;
  `roadmaps-error-state` overrides it with `!`. Set the icon colour per variant instead.

## Delivery

### Departures

- **S1, variants and sizes** (agent): `outline`, `link`, the `xs`/`lg` sizes and `icon-xs`/
  `icon-lg` are gone, so a group is always 40px (`default`) or 32px (`sm`); callers of
  `outline` use `secondary`. `destructive` is DHCW's solid red warning button, from new
  `--destructive-fill`/`--destructive-foreground`/`--destructive-hover` (the fill is the
  same red in both themes; `--destructive` stays the text red, lightened in dark).
  `--nhsw-colour-button-delete-hover` is copied from the pin. Pressed moves the button 1px
  as DHCW's does; DHCW's darker pressed fill is not ported.
- **S1, shadows** (agent): `shadow-control-edge` (a secondary button's bar, its own grey
  border colour) and `shadow-card-bar` (a card's 4px grey bar) join `shadow-control`; both
  are in `SHADOW_TOKENS`.
- **S2, tag variants** (agent): `Badge`'s variants are `neutral`, `info`, `success`,
  `warning`, `danger` and `outline`; the exported `TagVariant` type keys the connection
  status's table (`connection-status.tsx`), which replaces the coloured dot. A tag wraps
  its text (`wrap-anywhere`), so the card no longer overrides it for free text.
- **S3, the alert** (agent): `Alert` is a flex row (icon, `AlertContent`, `AlertAction`)
  instead of upstream's grid; variants are `info` (default), `success`, `warning` and
  `destructive`; `role` defaults to `alert` and can be `note`; `AlertTitle` can render as
  a heading. A failed load with nothing loaded is `destructive`; an expired session, or a
  problem above cards loaded earlier, is `warning`. The panel variant of the error state is
  now an `Alert` with an `h1`/`h2` title, no longer a centred `StatusPanel`, so the list
  states keep their roles, titles and actions. The start page's notice is an `Alert` with
  `role="note"` (the connection status has already announced it), `destructive` for an
  error and `info` for a closed or blocked popup.
- **S4, the card** (agent): the chevron is a link-blue circle that follows the title's hover;
  the grid gaps are 16px, 20px from `sm`; the skeleton card is square with the same bar. The
  card's `li`, link name, `aria-describedby` and `aria-hidden` details are unchanged.
- **S5, new pieces** (agent): `components/layout/{inset-text,context-chip,back-link}.tsx`.
  The chip replaces the start page's hand-styled one; the back link replaces the detail
  page's button-styled link. The inset text has no user yet (STY-016's shell).
- **S6** (agent): empty, not-found and skeleton corners are 4px (`rounded-lg`, the radius
  token); the menu's items are 4px with the keyboard focus `focus-fill` (D5); the toast
  already used `--radius`.
- **D4, D5**: settled in Decisions. The deleted `RoadmapIcon` had no other user.
- **First child's work**: the delivery was resumed after the first child was killed for host
  memory; its uncommitted work was reviewed and kept. Not test-first: the component tests
  were written beside the restyle, so their discrimination was shown by the class
  assertions failing on the old components, not by a red run before the code.

### Contract for dependents

- Use `Button` `default`/`secondary`/`destructive`/`ghost` at `default` or `sm`; `Badge`
  as a tag (`TagVariant`); `Alert` variants with `AlertContent`/`AlertTitle`/
  `AlertDescription`/`AlertAction`, never a hand-styled notice. STY-017's session-warning
  and failure notices use these.
- STY-016's shell has `InsetText`, `ContextChip` and `BackLink` ready (`@/components/layout/`).
- Tokens added: `--destructive-fill`, `--destructive-foreground`, `--destructive-hover`
  (and their `bg-`/`text-` utilities), `shadow-control-edge`, `shadow-card-bar`, each with
  its pairs in `contrast.test.ts`. No lint exception was added.
- A menu item's keyboard focus is `focus-fill`; a card's and a toast's is `focus-ring`; a
  text link's is `focus-link` (`BackLink`).

### Scenario evidence

| Scenario | Held by                                                                                                                                         |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `ui/button.test.tsx`; `contrast.test.ts` (`destructive-fill` fill and focus pairs); `focus-indicator.spec.ts` (fills); before/after screenshots |
| S2       | `ui/badge.test.tsx`; `connection-status.test.tsx` (every state maps to one variant); `roadmap-card.test.tsx`                                    |
| S3       | `ui/alert.test.tsx`; the roadmaps page, error-state and start-page tests (roles, titles and actions unchanged); `roadmap-errors.spec.ts`        |
| S4       | `roadmap-card.test.tsx` (square, barred, underlined link, decorative chevron, `focus-ring`); `roadmaps.spec.ts`; focus-indicator spec           |
| S5       | `layout/inset-text.test.tsx`, `context-chip.test.tsx`; `roadmap-detail-page.test.tsx` (back link has no `role`)                                 |
| S6       | `focus-indicator.spec.ts` (menu item fill, toast ring); before/after screenshots of the empty state, not-found, menu, skeletons and toast       |
| S7       | The existing page and E2E specs unchanged and passing (44 E2E, axe in both themes, 375px no-scroll specs); en/cy before/after screenshots       |
