# STY-096: The public site's interface text moves to typed catalogues

- **Status**: Done
- **Type**: Refactor + Copy
- **Area**: Features/UI + i18n (en + cy)
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: CHO-044 (hard; the sequence is strict, STY-095 D4)
- **Binding ADRs**: ADR-008, ADR-016 §STY-095 and §STY-096 amendments
- **Suggested model**: Opus — a string migration through the prerender, with Welsh
  plurals and fallback marking
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/273

## Summary

The public site's interface text, and the fixed text it owns about horizons, sections,
categories and organisations, moves into typed English and Welsh catalogues laid out as
the editor's are, so missing Welsh fails the build rather than falling back at runtime.
The site reads them without a runtime i18n library, to stay within its 100 KB script
budget (D10). Roadmap content from the spreadsheet stays as data, and an English
fallback in it keeps its `lang="en"` marker. Counts take each language's plural forms,
Welsh's six included; the existing Welsh is unchanged, and the new Welsh forms are flagged
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
**Then** each language uses its own plural form, with Welsh's zero, one, two, few, many
and other forms
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

## Decisions

- **D1** (owner, 2026-11-23, STY-095 grilling round 1): split from STY-095 as one of
  three stories; the built output is compared here (S3).
- **D2** (owner, 2026-11-23, round 3; the library departs by D10): the interface text in `strings.ts` and the fixed
  text in `content.ts` become catalogue keys; roadmap content stays `Localised` data,
  and `content.ts` keeps its icons and colours as code. Gives S1, S2.
- **D3** (owner, 2026-11-23, round 3, after a comparison of the two apps; the site's
  `t()` and `<Trans>` depart by D10): both apps mark
  an English fallback in roadmap content (WCAG 2.2 SC 3.1.2): interface text through
  `t()`, content through one component that sets `lang` when its language differs from
  the page's, and `<Trans>` where English content sits inside a Welsh sentence; an
  attribute takes the fallback unmarked. The site's half is here (S5), the editor's
  STY-098.
- **D4** (owner, 2026-11-23, round 3; i18next departs by D10): i18next plurals with the six Welsh forms, the new
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

- **D10** (owner, 2026-11-23, answering Q1 in delivery): "the public site does NOT use
  i18next/react-i18next (speed; the script budget stays 100 KB)". Q1 had found the
  site's script at 119,371 bytes with them, past Lighthouse's 100,000-byte
  `resource-summary:script:size` limit (the site's script with the 6.0 KB Simple
  Analytics script; about 96.5 KB at the base), and offered (a) a 130 KB budget, (b) 100
  KB with react-i18next once ~15–25 KB left the script, or (c) 100 KB without i18next.
  The owner chose (c): the typed catalogues, the existing Welsh, the six Welsh plural
  forms, the fallback marking, the language preference, the lint rule and the empty-value
  test stay; components read a typed strings object by property (`useStrings()`), with
  "NO t("key") shim/adapter and no string-key lookup", since that loses compile-time
  safety; plurals are typed objects chosen with `Intl.PluralRules`. `lighthouserc.json`
  is unchanged. Departs from D2–D4's library, `t()` and `<Trans>` for the site; ADR-008
  and ADR-016 take _STY-096 amendments_. Gives S1, S2, S4, S5.

## Out of scope

- Dependency versions and the font: STY-097.
- The editor's fallback marking: STY-098.
- Spreadsheet parsing, roadmap types and organisation names shared between the apps:
  ADR-016 rejects a contract package, as ADR-015 retires the format.

## Delivery

### Departures

- **S1, S2** (D10): the site's i18n takes the editor's catalogue layout under
  `apps/public-site/src/i18n/` without its library: `languages.ts`, `catalogue.ts` (a
  `Catalogue` type of the site's own, with no shared package, D4),
  `language-preference.ts` and `locales/`, plus `strings.ts` (both catalogues and the
  `Strings` type), `plural.ts`, `sentence.ts`, `localised.ts` (roadmap content's
  `resolve()` and `localise()`) and `language-context.ts` (the page's language and
  route, and `useStrings()`). `Lang` becomes `Language`; `src/lib/i18n.ts`,
  `src/lib/strings.ts`, `fill()` and `tr` go, and `<T>` becomes `<ContentText>`, for
  roadmap content alone (agent).
- **S1, S2** (D10): a value filled in is a typed function in the catalogue
  (`showingRoadmaps: ({ shown, total }) => …`), so `cy.ts` must take the same arguments;
  the `restrict-template-expressions` rule allows numbers and no other type in
  `src/i18n/locales/` alone, where counts are filled in unformatted, so the prerender
  and the browser agree (agent).
- **S4** (D10): a count is `plural(language, forms)`, whose forms type checking requires
  in full for that language (`pluralCategories`, which a test holds to
  `Intl.PluralRules`); `Intl.PluralRules` chooses the form. The count carries its
  language (`Plural<L>`), and `Catalogue<typeof en, "cy">` requires `Plural<"cy">`, so
  a Welsh count written with English forms fails type checking too (agent).
- **S2**: the catalogues were generated from `strings.ts` and `content.ts` by a one-off
  script, not retyped, so every existing string, Welsh included, is carried over as it
  was; `content.ts` keeps the sections' placement, the categories' icons and colours and
  the organisations' groups and codes. The English category labels in `en.ts` are the
  sheet's values (`CATEGORY_SHEET_VALUES`), as before (agent).
- **S2**: the month names that format "last updated" move from `roadmap-helpers.ts` into
  the catalogues (`site.months`), as the editor's are; the bilingual "Dewis iaith /
  Choose language" label moves from the toggle's JSX into `site.chooseLanguage`, the same
  in both catalogues (agent).
- **S2, S5** (D10): a label and its value become one catalogue sentence, so the
  catalogue owns the punctuation: "Status: …", "Last updated: …", "Updated …", "Product
  lead: …" and the details summary "What this covers", with ": " and the title hidden
  from sight. The elements (roadmap content, a `<time>`, the hidden span) are passed in,
  and `sentence()` sets them among the words, where the editor uses `<Trans>`. The text
  shown is unchanged (agent).
- **S2**: the accessibility and privacy pages' text is chosen from the catalogue by
  `INFO_PAGES`, one function per page (agent).
- **S1**: `i18next/no-literal-string` flags class-name strings assigned inside a JSX
  callback, so three are hoisted to module constants (`category-tiles.tsx`,
  `org-pills.tsx`, `site-footer.tsx`) (agent).
- **S3**: the one ARIA snapshot the count changes (`landing-cy-desktop.aria.yml`, "2
  drywydd") is updated by hand (agent).

### Contract for dependents

- STY-098: the site's half of D3 is `<ContentText>`
  (`apps/public-site/src/components/content-text.tsx`) over `resolve()`
  (`apps/public-site/src/i18n/localised.ts`); content inside a sentence is an element
  the catalogue's function places with `sentence()`. The editor's half keeps `<Trans>`
  (STY-098 D2), since the editor keeps react-i18next.
- STY-097: the site depends on neither i18next nor react-i18next, so they are the
  editor's alone; its new development dependency is `eslint-plugin-i18next`, at the
  editor's version.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `apps/public-site/src/i18n/catalogue.test.ts` (`cy has no empty values`, each count's text taken at 0, 1, 2, 3, 6 and 7); observed red: deleting `site.backToTop` from `cy.ts` fails type checking (TS2741), as does deleting a Welsh `roadmapCount` form (TS2345) or writing `showHiddenItems` as `plural("en", …)` (TS2322); a blank `site.backToTop`, a `productLead` that keeps only its value, or a Welsh `showHiddenItems` form that keeps only its count, fails that test; and literal JSX text in `feedback-link.tsx` fails `i18next/no-literal-string` |
| S2       | `apps/public-site/src/entry-server.test.tsx`, `src/app.test.tsx`; observed: the site built from the example data at the base and at the reworked head, all 15 HTML, XML and JSON files compared with React's `<!-- -->` text separators and the script's hashed name masked: 14 identical, and `cy/index.html` differs only in S4's count; the E2E suite                                                                                                                                                                                                        |
| S3       | observed: the same comparison; the one Welsh difference is `2 trywydd` → `2 drywydd` in the landing page's result count                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| S4       | `apps/public-site/src/i18n/plural.test.ts` (`gives the Welsh plural form for %i`, `gives the English plural form for %i`, `asks %s for every plural form its language uses`), red when the Welsh `roadmapCount` form `two` reads `trywydd`                                                                                                                                                                                                                                                                                                                      |
| S5       | `apps/public-site/src/components/roadmap-card.test.tsx` (`shows Welsh text, marking English fallbacks`, `marks only the English title in the Welsh details summary`), `src/components/roadmap-intro.test.tsx` (`marks only the English status inside the Welsh line`), red when `<ContentText>` drops or forces the mark                                                                                                                                                                                                                                        |
| S6       | `apps/public-site/src/i18n/language-preference.test.ts` (each branch, `["en-GB", "cy"]` starting in Welsh)                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| S7       | the guide and skill in the diff, reviewed                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| D10      | observed: `pnpm site:lighthouse` passes every assertion; it counts 97,605 bytes of script (the site's script with Simple Analytics) against the 100,000-byte limit, about 1.1 KB more than the base's ~96.5 KB                                                                                                                                                                                                                                                                                                                                                  |
