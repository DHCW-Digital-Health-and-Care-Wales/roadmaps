# STY-098: The editor marks English shown in place of Welsh

- **Status**: Done
- **Type**: Feature + Refactor
- **Area**: Domain + Features/UI
- **Epic**: [EPC-022-monorepo-and-backend-foundation](../../EPC-022-monorepo-and-backend-foundation/README.md)
- **Depends on**: STY-097 (hard; the sequence is strict, STY-095 D4)
- **Binding ADRs**: ADR-008
- **Suggested model**: Opus — a rendering change at every place roadmap content shows

## Summary

In Welsh, the editor shows a roadmap's English where its Welsh is empty, but nothing in
the page says the text is English, so a screen reader reads it with Welsh
pronunciation (WCAG 2.2 SC 3.1.2, Language of Parts). The editor adopts the public
site's way: roadmap content resolves to its text and the language it is in, and the
element that shows it carries `lang="en"` when that differs from the interface. A
Product Lead sees no change; a screen reader reads the English as English.

## Acceptance criteria

### S1: English content in the Welsh interface is marked

**Given** the editor in Welsh and an item whose title has no Welsh
**When** a Product Lead views the item on its roadmap's page, in the compact view, in the
navigation and in a dialog that names it
**Then** the English title is on an element with `lang="en"`
**And** the same item with a Welsh title carries no `lang` of its own, and nothing in the
English interface is marked

### S2: Content set inside a sentence is marked alone

**Given** a Welsh interface sentence that names an item or roadmap whose Welsh is empty
(a conflict, a removal question, "What changes")
**When** it renders
**Then** only the English name inside the Welsh sentence carries `lang="en"`

### S3: An attribute takes the fallback unmarked

**Given** an accessible name, title or other attribute built from content with no Welsh
**When** it renders
**Then** it holds the English text, as today, since an attribute cannot mark part of its
value
**And** sorting, search and the document title use the text alone, as today

## Decisions

- **D1** (owner, 2026-11-23, STY-095 grilling round 3, after a comparison of the two
  apps): both apps mark an English fallback in content; the editor's half is this story,
  in EPC-022 after STY-097, over a defect or doing it inside STY-096.
- **D2** (owner, 2026-11-23, round 3): the pattern is STY-096's: content through one
  component that sets `lang` when its language differs from the page's, `<Trans>` for
  content inside a sentence, attributes unmarked. Gives S1–S3.

## Starting point

Audited at `d2566963`: `localise()` in the roadmap domain returns a bare string, and
about twenty components render its result; the editor's only `lang` attributes are on
the language switcher's names of the languages.

## Delivery

### Departures

- **D2**: STY-096 dropped i18next from the public site after D2 was recorded (STY-096
  D10), so the site's `sentence()` is not the editor's pattern. The editor keeps
  react-i18next, as ADR-008's STY-095 amendment says: a catalogue sentence places the
  content as a self-closing element (`Tynnu “<title />”?`), and `<Trans>` fills it with
  `ContentText` (agent).
- **S1**: every visible place that shows roadmap content marks it, not only the four
  S1 names: the roadmap list's cards, the roadmap page's title, facts and product
  details, an item's card or row and each field (phase, description, outcome, each tag,
  each detail), the navigation's roadmap and family names, the families page's roadmaps,
  categories and organisations, each dialog and notice that names a roadmap, item or
  family, the conflict review's titles and names, "What changes", and a family's or
  category's option in the roadmap form (`<option lang>`) (agent).
- **S1**: a new item's title in "What changes" is English alone, so it is marked in
  Welsh as a fallback is; an organisation's short name is English in both languages
  (ADR-014) and stays unmarked (agent).
- **S3**: words that only complete a control's name stay plain with the attributes: a
  button's hidden words ("Tynnu First now", "Show the rest of …", the conflict's
  "Keep mine …"), the navigation's "…, unpublished changes" and its rail tooltip, and an
  option that is a sentence ("… (not listed)") (agent).
- **S3**: the conflict review's lead-in ("First now:") is one catalogue entry for the
  marked line and the buttons' plain words: the plain words read it with i18next's
  per-call interpolation markers `<` and ` />` (agent).
- Text the editor shows in one language whatever the interface's (the families page's
  English and Welsh names, a family notice's English name, a conflict's "In Welsh: …")
  is no fallback and stays unmarked; DEF-033 records it (agent).

### Contract for dependents

- Show roadmap content through `ContentText`
  (`apps/editor/src/features/roadmaps/components/content-text.tsx`); where an element
  sets its own `lang`, take `useContent()` (`hooks/use-content.ts`) or the pure
  `showContent()` (`shown-content.ts`), whose `lang` is set only for English shown in
  Welsh. An attribute, sort or search takes `localise()`; `resolve()` in the domain
  gives the text and its language.
- A catalogue sentence naming content places it as `<title />`, `<name />` or
  `<subject />` and is read through `<Trans>` only: `t()` returns the tag as text. The
  keys: `roadmaps.edit.removal.title`, `roadmaps.publish.notice.refused.removed` and
  `.targetLead`, `roadmaps.publishRoadmap.confirm.title.*`, `.notice.published`,
  `.savedAndPublished`, `.unpublished`, `.failed.*` and `.refused.problems.idTaken`,
  `roadmaps.add.added`, `roadmaps.lists.match.confirm.title`, `.notice.matched` and
  `.matchedPublic`, `roadmaps.families.form.changeTitle`, `.confirm.title` and
  `.organisations.entry`.
- `CutField` takes `value: ShownContent[]`, `DetailList` and `CutDetails` take
  `ShownDetail` (a `DetailLine` with an optional `lang`), `TagList` takes
  `ShownContent[]`, and `RemovalDialog`, `PublishedStateDialog`,
  `PublishedStateNotice`, `AddedRoadmapNotice`, `RoadmapHeader` and
  `FamilyChangeDialog` take the title or name as `LocalisedText`.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `apps/editor/src/domain/roadmap/localised-text.test.ts` (`resolve`, red against the base's `localise` before `resolve` existed); `apps/editor/src/features/roadmaps/shown-content.test.ts` (the four cases, red when `lang` is always the resolved language); `components/content-text.test.tsx` and `pages/roadmap-detail-page-english-in-welsh.test.tsx` (the page's title, cards, navigation, compact view and removal question in Welsh; nothing marked in English), red when `ShownText` never marks |
| S2       | `components/content-text.test.tsx` (`marks only the English inside a Welsh sentence`); `pages/roadmap-detail-page-english-in-welsh.test.tsx` (the removal question); `pages/roadmap-detail-page-publishing-roadmap.test.tsx` (`speaks Welsh throughout`, the failed notice's title), each red when `ShownText` never marks                                                                                                                                                                                |
| S3       | `pages/roadmap-detail-page-english-in-welsh.test.tsx` (the Remove button's name holds the English unmarked); sorting, search and the document title still call `localise()` and `syncDocumentLanguage`, unchanged, under their existing tests (`group-roadmaps`, `narrow-roadmaps`, `create-i18n`)                                                                                                                                                                                                        |
