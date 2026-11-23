# CHO-045: The lint disables STY-095 added are fixed at their cause

- **Status**: Done
- **Type**: Refactor
- **Area**: Features/UI + CI/CD
- **Epic**: standalone
- **Depends on**: STY-095 (hard)
- **Binding ADRs**: ADR-016
- **Suggested model**: Opus — each disable needs the rule's own exemptions read against
  the code before it is removed
- **Delivered**: _(add on delivery)_

## Summary

STY-095's ESLint base came with 14 reasoned `eslint-disable-next-line` lines. Read
against each rule's documentation and source, 10 silence a finding the code can meet: a
ref hidden from a rule by its name, jsx-a11y strict counting `onFocus`, a form React or
the rule documents, or an index key on items with an identity of their own. Done: those
10 are gone, with behaviour kept and nothing disabled in their place; the other 4 stay.

## Measurement

At commit `bb9c96a5`, the disables STY-095 added (`git diff 582a9a7e 1589af15`):

| Line                                                                    | Rule                                                | Verdict                                                                                                                                        |
| ----------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/editor/src/features/roadmaps/components/cut-field.tsx:84`         | `@eslint-react/set-state-in-effect`                 | Remove: the rule exempts a value read from a ref, and recognises a ref parameter only by a name ending in `Ref`; the parameter is `element`    |
| `apps/editor/src/features/roadmaps/editing/use-row-icons.ts:27`         | `@eslint-react/set-state-in-effect`                 | Remove: as above (`rows`); the hook repeats `cut-field`'s measuring hook without its re-measure once the fonts are ready                       |
| `apps/editor/src/components/layout/sticky-header.tsx:46`                | `jsx-a11y-x/no-static-element-interactions`         | Remove: `onFocus` only sees focus bubbling up from a control inside, and strict's handler list counts it                                       |
| `apps/editor/src/features/roadmaps/components/compact-item-row.tsx:117` | `jsx-a11y-x/no-noninteractive-element-interactions` | Remove: as above                                                                                                                               |
| `apps/editor/src/features/roadmaps/components/roadmap-item-card.tsx:56` | `jsx-a11y-x/no-noninteractive-element-interactions` | Remove: as above                                                                                                                               |
| `apps/editor/src/features/roadmaps/editing/details-field.tsx:217`       | `react-hooks/exhaustive-deps`, `@eslint-react/…`    | Remove: `useEffectEvent`, which React documents for reading the latest props without re-running an effect (the second rule name STY-095 added) |
| `apps/editor/src/features/roadmaps/editing/use-leave-after-press.ts:55` | `@eslint-react/web-api-no-leaked-timeout`           | Remove: keep the timer's id and clear it in the cleanup, which already resets every other flag                                                 |
| `apps/public-site/src/entry-server.tsx:173`                             | `@typescript-eslint/no-non-null-assertion`          | Remove: a missing landing page would spread `undefined` into the root page; a `throw` fails the build instead                                  |
| `apps/editor/src/features/roadmaps/editing/refusal-notice.tsx:90`       | `@eslint-react/no-array-index-key`                  | Remove (D3): each removed item has its own place as loaded, which the notice drops with the rest of the item                                   |
| `apps/editor/src/features/roadmaps/editing/tag-list.tsx:8`              | `@eslint-react/no-array-index-key`                  | Remove (D3): no two of an item's tags share an English name, since reading drops a repeat and editing refuses one                              |
| `roadmap-grid-skeleton.tsx:21`, `published-state-notice.tsx:105`        | `@eslint-react/no-array-index-key`                  | Keep: placeholders, and a derived message list, have no identity but their place; the rule's docs accept a truly static list                   |
| `apps/editor/src/features/roadmaps/editing/item-travel.ts:50`           | `@eslint-react/dom-no-flush-sync`                   | Keep: the rule's docs name a `startViewTransition` helper as a legitimate use and advise a line disable                                        |
| `apps/public-site/src/lib/focus.ts:22`                                  | `@eslint-react/dom-no-flush-sync`                   | Keep: one handler renders, measures and scrolls                                                                                                |

## Acceptance criteria

### S1: The two measuring hooks need no disable

**Given** `CutField`, `CutDetails` and the Tags field's rows
**When** they measure their laid-out element
**Then** they do it through one hook, before the browser paints, re-measuring on a
resize, a content change and once the fonts are ready
**And** `@eslint-react/set-state-in-effect` passes with no disable

### S2: A container that observes focus is not a control

**Given** an element no keyboard reaches with an `onFocus` or `onBlur` that observes
focus bubbling up from controls inside it
**When** the workspace is linted
**Then** jsx-a11y's interaction rules do not report it, and still report its click, key
and pointer handlers

### S3: No other disable stands where the code can meet the rule

**Given** the details editor's first focus, the tags field's Tab timer and the site's
landing page
**When** the workspace is linted
**Then** each passes with no disable, with behaviour kept

### S4: A list item with an identity is keyed by it (D3)

**Given** the removed items a refused publish names, and an item's tags
**When** they are drawn as a list
**Then** each is keyed by its own identity (its place as loaded, or its English name),
with no disable

## Decisions

- **D1** (owner, 2026-11-23, after the audit): "raise the chore and also apply this
  fixes now then create a PR". This covers the fixes the audit proposed, including the
  jsx-a11y handler option, which narrows two strict rules by `onFocus` and `onBlur`.
- **D2** (agent, 2026-11-23): one `useMeasure` in `apps/editor/src/lib/`, over only
  renaming the two parameters, so the Tags field gains the re-measure once the fonts are
  ready that `CutField` already had. Kept by the owner in grilling round 1.
- **D3** (owner, 2026-11-23, grilling round 2): an index key stands only where the
  place is the identity. Fix the refusal notice's removed items and the tag list in
  this PR; keep the skeleton, the published-state problems and both `flushSync`
  disables. Adds S4.
- **D4** (owner, 2026-11-23, CHO-046 D1): react-hooks owns the rules both plugins run,
  so S1's `set-state-in-effect` is react-hooks' from CHO-046 on. Each hook still takes
  its ref as `…Ref`, as the editor names refs.

## Out of scope

- Which plugin owns each rule both run: CHO-046, delivered in the same PR.
- The disables older than STY-095 (`navigation-resize-handle`, `family-form`,
  `quick-add`, `label`, `roadmap-swatch`, the two context modules, the site's
  `rich-text` and `main.tsx`).

## Delivery

### Departures

- **S1**: in the Tags field, a list with no width, or one whose probe is missing, now
  answers "words" rather than keeping its last answer. Only a hidden list has no width,
  and it is measured again as it shows (agent).
- **S1**: `useMeasure` returns whatever primitive its `measure` does, from an
  `unmeasured` value, so the cut and the rows' icons are booleans and only a detail
  list's cuts a string (agent, from review).
- **S2**: the option takes each rule's own default handlers without `onFocus` and
  `onBlur` (`withoutFocusHandlers`), and keeps strict's `onLoad`/`onError` allowance on
  `body`, `iframe` and `img`, which setting the option would otherwise drop (agent).
- **S4**: a removed item is keyed as a conflict is, by its ID, or with none by its place
  as loaded: an item kept from an earlier read keeps its old place, which an item moved
  since can share (agent, from review).

### Contract for dependents

A hook that measures a laid-out element uses `useMeasure` from
`apps/editor/src/lib/use-measure.ts`, with a module function as `measure`. `TagList`
takes an item's tags as `LocalisedText` and keys each by its English name. A refused
publish's notice holds each removed item as an `ItemTarget`, keyed by its ID or place.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `apps/editor/src/lib/use-measure.test.ts` (the first read, a single read with no `ResizeObserver`, a read again on a content change, a resize and the fonts ready, none once gone; each case shown red by breaking the hook). `pnpm lint` passes with no disable; with the old parameter names, `eslint --stdin` reported `set-state-in-effect` at `cut-field.tsx:84` and `use-row-icons.ts:27` before CHO-046. `roadmap-item-card.test.tsx` and `roadmap-detail-page-tags.test.tsx` pass. jsdom cannot lay out, so the E2E card and tags specs hold the measurements themselves |
| S2       | `eslint --print-config` shows both rules' `handlers` without `onFocus` and `onBlur`; `pnpm lint` passes with the three disables gone                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| S3       | `pnpm lint` with no disable; `roadmap-detail-page-details.test.tsx`, `roadmap-detail-page-quick-add.test.tsx` (Tab leaving a quick-add field) and `apps/public-site/src/entry-server.test.tsx` pass                                                                                                                                                                                                                                                                                                                                                                              |
| S4       | `refusal-notice.test.tsx` (two removed items at one place, both named with no duplicate key; red with the key by place alone); `roadmap-detail-page-editing.test.tsx`, `roadmap-detail-page-tags.test.tsx` and `pending-changes-store.test.ts` pass                                                                                                                                                                                                                                                                                                                              |
