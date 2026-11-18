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
- **Live regions.** Trace each `role=status`, `role=alert` and `aria-live`
  region (page notices, the session warning's announcements) through every
  change of state. A region in the accessibility tree speaks new text or
  swapped nodes inside it; an alert also speaks as it renders, while a polite
  region that mounts holding its text may say nothing. Check that a polite
  region is in the tree before the news comes, not in a closed drawer's or
  dialog's portal, nor outside an open modal, which Base UI hides from all but
  `[aria-live]` elements. News leaves it text to speak, an emptying included (it says none
  is left rather than clearing). A swapped visible entry or a language switch
  is not news: an `sr-only` announcer holds the text it said and stays quiet
  through them, while visible status text follows the language and is re-read.
  A repeated message is spoken again through a new node inside a region that
  stays mounted (a fresh `key`), or by remounting an alert.
- **Localisation and copy (ADR-008).** UI copy comes from catalogue keys
  mapped from codes (``t(`errors.${error.kind}`)``,
  ``t(`auth.status.${state.status}`)``); domain and infrastructure emit codes,
  never prose, and `AppError.message` is diagnostics, never rendered. Check
  plural keys (`_one`/`_other` in English; all six Welsh forms) and that
  `t("…", { count })` passes `count`, copy is not assembled by concatenation or
  by branching on English text, `<html lang>`/`document.title` stay in sync,
  stored language preference handling is try/catch-wrapped, and a rendered
  error is never an error object or its `message`. Welsh text is
  machine-assisted: flag a clearly wrong or untranslated string.
- **Styling and accessibility.** Verify classes, variants and inline geometry
  produce the intended CSS, including `cn`/tailwind-merge ordering, cascade,
  state variants and caller overrides (a link styled as a button needs
  `cn(buttonVariants())`; shadcn `Alert` forces icon colour with
  `*:[svg]:text-current`; Base UI's `focusableWhenDisabled` sets
  `data-disabled`, not `:disabled`, so `disabled:` variants do not apply; a
  Base UI `render={<Link/>}` button adds `role="button"`). A visual no-op needs
  computed-style or visual evidence. Hold UI to WCAG 2.2 AA: accessible names
  that contain their visible text (the language switcher's "Language English"
  keeps a space node), native structure and landmarks, live regions (above),
  `aria-busy`, focus order and visible focus,
  focus management in `AppShell` (focus moves to `<main>` after in-app
  navigation, and when the focused control inside `<main>` is removed; the skip
  link focuses `<main>` because hash history owns the fragment), menu and dialog
  keyboard behavior, contrast in light and dark, and
  `prefers-reduced-motion`. Components under `components/ui/` stay close to
  upstream shadcn (Base UI flavour, no Radix); hand-rolled competing primitives
  are a finding.
- **Responsive layout.** Check a changed screen at 375 px and 200% zoom, and a
  changed row of controls in Welsh at the widths
  `.agents/skills/implement-story/references/validation.md` sets for visible UI,
  where each wider layout arrives at its narrowest. For a stuck or pinned bar,
  whose overflow a `scrollWidth` check misses, the evidence is as
  `tests/e2e/AGENTS.md` sets.
