# STY-096: The public site's interface text moves to react-i18next

- **Status**: Proposed — split from STY-095 in the owner's grilling of 2026-11-23 (D1–D6);
  third in the alignment sequence
- **Type**: Refactor + Copy
- **Area**: Features/UI + i18n (en + cy)
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: CHO-044 (hard; the sequence is strict, STY-095 D4)
- **Binding ADRs**: ADR-008, ADR-016 §STY-095 amendments
- **Suggested model**: Opus — a string migration through the prerender, with Welsh
  plurals and fallback marking

## Summary

The public site's interface text, and the fixed text it owns about horizons, sections,
categories and organisations, moves into typed English and Welsh catalogues rendered
through react-i18next, as the editor's is, so missing Welsh fails the build rather than
falling back at runtime. Roadmap content from the spreadsheet stays as data, and an
English fallback in it keeps its `lang="en"` marker. Counts use i18next plurals with
Welsh's six forms; the existing Welsh is unchanged, and the new Welsh forms are flagged
in the pull request for a Welsh check. Readers see the same pages, apart from those
plural forms.

## Acceptance criteria

### S1: Missing Welsh fails before it reaches a reader

**Given** the site's English and Welsh catalogues
**When** an English key has no Welsh counterpart, or a count lacks a Welsh plural form
**Then** `pnpm typecheck` fails, as it does for the editor's catalogues
**And** a test fails for an empty value, and `pnpm lint` fails for a literal string in
the site's JSX

### S2: Both languages are prerendered from the catalogues

**Given** the site built from the example data
**When** a reader opens any page in English or in Welsh, with JavaScript on or off
**Then** its interface text, the horizon, section and category names and the
organisations' names come from the catalogues, in the page's language
**And** each page's URL, `<html lang>`, title, hreflang alternates and `og:locale` are
as before, and hydration takes over without a mismatch

### S3: The existing Welsh is unchanged

**Given** every Welsh string the site had before this story
**When** the built Welsh pages are compared before and after
**Then** every Welsh string appears as before, and the only differences are the count
forms of S4, listed in the pull request

### S4: Counts take each language's plural forms

**Given** a count of roadmaps, items or matches (the forms the site now branches on by
hand)
**When** it is shown for 0, 1, 2, 3, 6 and 7 in Welsh, and 1 and 2 in English
**Then** each language uses its own plural form through i18next, with Welsh's zero,
one, two, few, many and other forms
**And** the Welsh forms new to the site are written with the copywriter skill and listed
in the pull request for a Welsh check

### S5: An English fallback in roadmap content is marked

**Given** a roadmap item with an English title and an empty Welsh title
**When** a reader opens its roadmap in Welsh
**Then** the title shows in English, on an element with `lang="en"`
**And** text with its Welsh carries no `lang` of its own, and where English content is
set inside a Welsh sentence, only the English part is marked

### S6: The language preference has the editor's shape

**Given** a first visit to the site's root
**When** the start language is chosen
**Then** it is the stored choice, else the first supported browser language (any
`cy-*` gives Welsh), else English, as today
**And** the module that chooses it takes its storage and browser languages as
arguments, as the editor's does, and its tests cover each branch

### S7: The site's guides and copywriter skill follow

**Given** the site's guide and the copywriter skill
**When** an agent changes the site's interface text
**Then** the site's guide points to its catalogues and to the copywriter skill, with
the privacy note's place in step with the analytics script
**And** the copywriter skill covers the site's catalogues, with a section for the
public reader's register beside the shared rules

## Decisions

- **D1** (owner, 2026-11-23, STY-095 grilling round 1): split from STY-095 as one of
  three stories; the built output is compared here (S3).
- **D2** (owner, 2026-11-23, round 3): the interface text in `strings.ts` and the fixed
  text in `content.ts` become catalogue keys; roadmap content stays `Localised` data,
  and `content.ts` keeps its icons and colours as code. Gives S1, S2.
- **D3** (owner, 2026-11-23, round 3, after a comparison of the two apps): both apps mark
  an English fallback in roadmap content (WCAG 2.2 SC 3.1.2): interface text through
  `t()`, content through one component that sets `lang` when its language differs from
  the page's, and `<Trans>` where English content sits inside a Welsh sentence; an
  attribute takes the fallback unmarked. The site's half is here (S5), the editor's
  STY-098.
- **D4** (owner, 2026-11-23, round 3): i18next plurals with the six Welsh forms, the new
  forms reviewed, over keeping the hand branch. Amends STY-095's placeholder claim "the
  Welsh unchanged" to "the existing Welsh unchanged". Gives S3, S4. The language
  preference takes the editor's shape with no shared package (round 5). Gives S6.
- **D5** (owner, 2026-11-23, round 4): one copywriter skill, with a public-site section
  for the public reader's register. Gives S7.
- **D6** (owner, 2026-11-23, round 2): delivered after STY-095 and CHO-044, each merged
  first.

## Out of scope

- Dependency versions and the font: STY-097.
- The editor's fallback marking: STY-098.
- Spreadsheet parsing, roadmap types and organisation names shared between the apps:
  ADR-016 rejects a contract package, as ADR-015 retires the format.
