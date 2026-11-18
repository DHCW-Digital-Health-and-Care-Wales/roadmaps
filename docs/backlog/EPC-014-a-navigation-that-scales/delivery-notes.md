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
