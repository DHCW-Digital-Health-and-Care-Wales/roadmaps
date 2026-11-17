# Code review lenses: UI, copy and routing

Lenses for a diff touching a route, a component, copy, styles or the base path. Apply them in `../SKILL.md`'s
working order, and grade and report findings as it sets.

- **Routing and Pages (ADR-004, ADR-007).** Routes use hash history, so deep
  links are `#/roadmaps/<id>`; the router, `Link`s and E2E use relative URLs,
  never an absolute `/path` that ignores the base. The build base path comes
  from `resolveBasePath` (`/roadmaps-editor/` in CI, `/` locally); assets,
  `index.html` references, the inline theme script and any `fetch` of a static
  file must work under both. Route modules stay thin and delegate to feature
  pages; `src/routeTree.gen.ts` is regenerated and committed when routes
  change; files in `src/routes/` become routes, so tests do not live there.
  Check params are validated (an unknown or malformed `roadmapId` renders the
  not-found state, not a crash), that links keep working on reload, and that
  workflow changes keep least-privilege permissions, pinned action SHAs and a
  deploy only from `main` (`actionlint` clean).
- **Localisation and copy (ADR-008).** UI copy comes from catalogue keys
  mapped from codes (``t(`errors.${error.kind}`)``,
  ``t(`auth.status.${state.status}`)``); domain and infrastructure emit codes,
  never prose, and `AppError.message` is diagnostics, never rendered. Check
  plural keys (`_one`/`_other` in English; all six Welsh forms) and that
  `t("…", { count })` passes `count`, copy is not assembled by concatenation or
  by branching on English text, `<html lang>`/`document.title` stay in sync,
  stored language preference handling is try/catch-wrapped, and a rendered
  error is never an error object or its `message`. Welsh text is
  machine-assisted: flag a clearly wrong or untranslated string, and keep
  Welsh-length overflow in mind for layout.
- **Styling and accessibility.** Verify classes, variants and inline geometry
  produce the intended CSS, including `cn`/tailwind-merge ordering, cascade,
  state variants and caller overrides (a link styled as a button needs
  `cn(buttonVariants())`; shadcn `Alert` forces icon colour with
  `*:[svg]:text-current`; Base UI's `focusableWhenDisabled` sets
  `data-disabled`, not `:disabled`, so `disabled:` variants do not apply; a
  Base UI `render={<Link/>}` button adds `role="button"`). A visual no-op needs
  computed-style or visual evidence. Hold UI to WCAG 2.2 AA: accessible names
  that contain their visible text (the language switcher's "Language English"
  keeps a space node), native structure and landmarks, live regions (`role=status`
  and `role=alert` usage, page notices, the session warning's announcements), `aria-busy`, focus order and visible focus,
  focus management in `AppShell` (focus moves to `<main>` after in-app
  navigation, and when the focused control inside `<main>` is removed; the skip
  link focuses `<main>` because hash history owns the fragment), menu and dialog
  keyboard behavior, contrast in light and dark, 375 px layouts, 200% zoom and
  `prefers-reduced-motion`. Overflow arrives just above a breakpoint, where a
  layout's longer labels have the least room: measure a changed row at the
  narrowest width of each layout (640 px at `sm`, 1024 px at `lg`) in Welsh. A
  `position: fixed` bar (a stuck or pinned one) clips its overflow instead of
  scrolling the page, so `scrollWidth` misses it: compare each control's box
  with `document.documentElement.clientWidth`. Components under `components/ui/`
  stay close to upstream shadcn (Base UI flavour, no Radix); hand-rolled
  competing primitives are a finding.
