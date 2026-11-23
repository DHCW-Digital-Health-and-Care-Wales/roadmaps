# STY-096: The public site's interface text moves to react-i18next

- **Status**: In progress — PR #273; Q1 (the script budget) awaits the owner
- **Type**: Refactor + Copy
- **Area**: Features/UI + i18n (en + cy)
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: CHO-044 (hard; the sequence is strict, STY-095 D4)
- **Binding ADRs**: ADR-008, ADR-016 §STY-095 amendments
- **Suggested model**: Opus — a string migration through the prerender, with Welsh
  plurals and fallback marking
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/273

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

**Given** a count of roadmaps or of hidden items (the counts the site now branches on by
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
**Then** it is the stored choice, else Welsh when any of the browser's languages is
Welsh (`cy` or `cy-*`), else English, as today: a browser listing `["en-GB", "cy"]`
starts in Welsh
**And** the module that chooses it takes its storage and browser languages as
arguments, as the editor's does, and its tests cover each branch

### S7: The site's guides and copywriter skill follow

**Given** the site's guide and the copywriter skill
**When** an agent changes the site's interface text
**Then** the site's guide points to its catalogues and to the copywriter skill, with
the privacy note's place in step with the analytics script
**And** the copywriter skill covers the site's catalogues, with a section for the
public reader's register beside the shared rules

## Open questions

- **Q1** (agent, 2026-11-23, in delivery): the site's 100 KB script budget cannot hold
  i18next. Lighthouse's `resource-summary:script:size` limit is 100,000 bytes
  (`apps/public-site/lighthouserc.json`; ADR-016 keeps the site's own router "within a
  100 KB script budget"), and it counts the site's script with the Simple Analytics
  script (6.0 KB): about 96.5 KB at the base. Bundled alone, i18next is 16.7 KB gzip
  and react-i18next's provider, hook and `<Trans>` 7.5 KB more; in the site's script
  they add about 23 KB, and `pnpm site:lighthouse` finds 119,371 bytes and fails on that
  assertion alone.
  - (a) Raise the budget to 130 KB (recommended) — the story ships as decided; the
    lighthouserc limit and ADR-016's line change, each page loads ~23 KB more script,
    and ~10 KB of headroom remains.
  - (b) Keep 100 KB and react-i18next — this story waits on a change that moves ~15–25
    KB out of the script, such as the roadmap data it bundles.
  - (c) Keep 100 KB and drop i18next for the site — typed catalogues and
    `Intl.PluralRules` plurals of the site's own; D2–D4 and ADR-008's STY-095 amendment
    are reversed for the site, and this delivery is reworked.

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
- **D7** (agent, 2026-11-23, from the review of this record): the language preference
  takes the editor's shape but keeps the site's rule, Welsh when any browser language is
  Welsh, over the editor's first-match, since the owner asked for the shape alone and
  the public sees no change. Gives S6.
- **D8** (owner, 2026-11-23, with the order): this story changes the public site's
  pages (S4's Welsh counts, S5's marks), so the owner sees its screenshots before
  approving the merge (the epic's `delivery-notes.md`).

- **D9** (agent, 2026-11-23, in delivery): the Welsh count forms. A roadmap count keeps
  the singular after a number, as the site's Welsh did, and mutates it after 2, 3 and 6:
  _0, 1 and 7 trywydd_ as before, _2 drywydd_, _3 thrywydd_, _6 thrywydd_; zero keeps
  the digit, as the English does. A hidden-items count is _Dangos {n} eitem gudd_ in
  every form, as before, since _eitem_ takes no mutation after a number. Gives S4.

## Out of scope

- Dependency versions and the font: STY-097.
- The editor's fallback marking: STY-098.
- Spreadsheet parsing, roadmap types and organisation names shared between the apps:
  ADR-016 rejects a contract package, as ADR-015 retires the format.

## Delivery

### Departures

- **S1, S2**: the site's i18n takes the editor's module shape under
  `apps/public-site/src/i18n/`: `languages.ts`, `create-i18n.ts`, `catalogue.ts` (a copy
  of the editor's `Catalogue` type, with no shared package, D4), `language-preference.ts`,
  `i18next.d.ts` and `locales/`, plus `localised.ts` (roadmap content's `resolve()` and
  `localise()`) and `language-context.ts` (the page's language and route). `Lang` becomes
  `Language`; `src/lib/i18n.ts`, `src/lib/strings.ts`, `fill()` and `tr` go, and `<T>`
  becomes `<ContentText>`, for roadmap content alone (agent).
- **S2**: the catalogues were generated from `strings.ts` and `content.ts` by a one-off
  script, not retyped, so every existing string, Welsh included, is carried over as it
  was; `content.ts` keeps the sections' placement, the categories' icons and colours and
  the organisations' groups and codes. The English category labels in `en.ts` are the
  sheet's values (`CATEGORY_SHEET_VALUES`), as before (agent).
- **S2**: the month names that format "last updated" move from `roadmap-helpers.ts` into
  the catalogues (`site.months`), as the editor's are; the bilingual "Dewis iaith /
  Choose language" label moves from the toggle's JSX into `site.chooseLanguage`, the same
  in both catalogues (agent).
- **S2, S5**: a label and its value become one catalogue sentence, so the catalogue owns
  the punctuation: "Status: `<status/>`", "Last updated: `<time>{{date}}</time>`",
  "Updated `<time>{{date}}</time>`", "Product lead: {{name}}" and the details summary
  "What this covers`<hidden>`: `<title/>``</hidden>`", the elements placed by `<Trans>`.
  The text shown is unchanged (agent).
- **S2**: each language has its own i18next instance in `LanguageProvider`, switched with
  the route's language, so the in-page language toggle renders the new language in one
  pass, as before (agent).
- **S1**: `i18next/no-literal-string` flags class-name strings assigned inside a JSX
  callback, so three are hoisted to module constants (`category-tiles.tsx`,
  `org-pills.tsx`, `site-footer.tsx`) (agent).
- **S2**: the site takes i18next 27.0.1 and react-i18next 18.0.1, the editor's versions,
  so no new package enters the lockfile; react-i18next gains a second snapshot against
  the site's React 19.3.0, which STY-097 aligns (agent).
- **S3**: the host was loaded, so the E2E suite and Lighthouse are left to the pull
  request's CI; the one ARIA snapshot the count changes
  (`landing-cy-desktop.aria.yml`, "2 drywydd") is updated by hand (agent).

### Contract for dependents

- STY-098: the site's half of D3 is `<ContentText>`
  (`apps/public-site/src/components/content-text.tsx`) over `resolve()`
  (`apps/public-site/src/i18n/localised.ts`), with `<Trans>` and a named element for
  content inside a sentence.
- STY-097: the site's `react-i18next` resolves against React 19.3.0, the editor's
  against 19.3.1.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `apps/public-site/src/i18n/catalogue.test.ts` (`cy has no empty values`); observed red: deleting `site.backToTop` or `landing.roadmapCount_few` from `cy.ts` fails `tsc -b` (TS2741), a blank `site.backToTop` fails that test, and literal JSX text in `feedback-link.tsx` fails `i18next/no-literal-string`                   |
| S2       | `apps/public-site/src/entry-server.test.tsx`, `src/app.test.tsx`; observed: the site built from the example data before and after, all 15 HTML, XML and JSON files compared with React's `<!-- -->` text separators and the script's hashed name masked: 14 identical, and `cy/index.html` differs only in S4's count; CI's E2E |
| S3       | observed: the same comparison; the one Welsh difference is `2 trywydd` → `2 drywydd` in the landing page's result count                                                                                                                                                                                                         |
| S4       | `apps/public-site/src/i18n/create-i18n.test.ts` (`gives the Welsh plural form for %i`, `gives the English plural form for %i`), red when `roadmapCount_two` reads `trywydd`                                                                                                                                                     |
| S5       | `apps/public-site/src/components/roadmap-card.test.tsx` (`shows Welsh text, marking English fallbacks`, `marks only the English title in the Welsh details summary`), `src/components/roadmap-intro.test.tsx` (`marks only the English status inside the Welsh line`), red when `<ContentText>` drops or forces the mark        |
| S6       | `apps/public-site/src/i18n/language-preference.test.ts` (each branch, `["en-GB", "cy"]` starting in Welsh)                                                                                                                                                                                                                      |
| S7       | the guide and skill in the diff, reviewed                                                                                                                                                                                                                                                                                       |
