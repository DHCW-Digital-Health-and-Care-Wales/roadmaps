# EPC-014 delivery notes

- `tests/e2e/fixtures/navigation-world.ts` (`NAVIGATION_WORLD`) is the analysis's
  14-roadmap world, enough to scroll the navigation at 1280 × 800; use it for the
  scenarios' sample data.
- The page holds two polite live regions, the shell's count and the search's
  (`NavigationSearchProvider`): a spec finds one by its text, never as the only
  `[aria-live=polite]`.
- What the navigation lists is `useNavigationSearch()`'s `groups` and `found`
  (`narrow-roadmaps.ts`); a new narrowing extends the provider and `narrowGroups`
  rather than filtering in `RoadmapNavigation`.
- The shell's top row is `NavigationLandmark`'s `top`; its list, the element that
  scrolls, is `[data-slot=navigation-list]`.
- The closed families are `useNavigationSearch()`'s `closed`, `toggleFamily` and
  `toggleAllFamilies`; a new narrowing keeps `foldable` (`roadmap-navigation.tsx`) false
  so families show as plain headings, and `narrowGroups` already ignores `closed`.
- A reload ends the Google session: an E2E scenario that reloads connects again before
  reading the navigation. A family's storage key is `nameKey` of its English name, so
  "Single Record" is `singlerecord`.
- A button on the navy navigation is `Button variant="navigation"`; `ghost` with class
  overrides hides the focus fill.
- The count is a `NavigationButton` while two or more roadmaps have changes (STY-063), and
  `useNavigationSearch().onlyChanged` is the narrowing: it empties the search, ends as soon
  as non-blank text is typed or fewer than two roadmaps are left, and says nothing for a
  blank search. A spec of the live region reads the provider's, not the shell's count.
- `recordSayings()` (`features/roadmaps/testing/`) also records what a live region held
  already, and the shell's region keeps the count's words: filter those out of an
  expectation, as `changed-roadmaps-only.test.tsx` does.
