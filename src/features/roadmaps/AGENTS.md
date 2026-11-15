# src/features/roadmaps — tests

- Read the focus a dialog or an opened field moves into through `expectOpeningFocus`
  (`testing/opening-focus.ts`), never a bare `toHaveFocus()` after opening it: focus lags
  the element it lands on.
