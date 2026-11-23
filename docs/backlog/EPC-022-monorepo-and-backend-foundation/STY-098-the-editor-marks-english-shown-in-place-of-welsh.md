# STY-098: The editor marks English shown in place of Welsh

- **Status**: Proposed — recorded in the owner's STY-095 grilling (2026-11-23, D1–D2);
  fifth in the alignment sequence
- **Type**: Feature + Refactor
- **Area**: Domain + Features/UI
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
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
