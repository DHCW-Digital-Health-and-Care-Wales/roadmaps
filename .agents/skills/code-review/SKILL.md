---
name: code-review
description: >-
  Review a diff, branch or PR for correctness: requirements coverage, regressions,
  async state, security, untrusted-data parsing and runtime contracts. Use for code
  review and before a PR, in the lanes implement-story's delegation reference sets;
  maintainability and convention smells belong to the quality-review companion skill.
user-invocable: true
---

# Code review

Judge whether the change does the right thing and preserves existing behavior.
`quality-review` owns standards and maintainability under a separate verdict.

Invoke as `/code-review [target] [--comment]`. The target is the current branch
against `origin/main` with staged, unstaged and relevant untracked files (the
default); a PR number; a branch, commit or tag against its merge-base with
`origin/main`; or an explicit base and head. For a PR number or `--comment`,
read `references/pr-target.md`. Otherwise report in the conversation only: do
not post, change code, merge or message other people as part of reviewing.

## Working order

1. **Pin the scope.** Take the base/head SHAs and diff command the brief
   supplies (`.agents/skills/implement-story/references/delegation.md`);
   otherwise resolve the target to SHAs against the merge-base, with
   working-tree and untracked files when defaulted, which a three-dot diff
   misses. Keep the checkout read-only; read other revisions with
   `git show <sha>:<path>`. A bad ref is a scope error; an empty scope is
   "nothing to review", not a pass.
2. **Find the requirements.** Read the user's instructions and the linked
   story, defect or chore (`docs/backlog/`, ids `STY-<nnn>`, `DEF-<nnn>`, `CHO-<nnn>`) with
   its acceptance criteria, the PR body and the binding ADRs in `docs/adr/`,
   following commit and PR references. Read the `AGENTS.md` along each changed
   path's directory ancestry (root `AGENTS.md`, `tests/e2e/AGENTS.md`,
   `docs/AGENTS.md`), its Handoff log gotchas, and each _Repo contract_ below
   the diff reaches; repo invariants outrank generic preferences. Without a
   spec, say what could not be verified and continue with regressions and
   contracts.
3. **Trace behavior.** Open touched files beyond the hunks, their callers,
   hooks, providers, adapters, schemas and tests, and follow inputs through
   state, caches and rendered output. Read a definition before assuming a
   name, type, CSS class, fake or comment proves behavior. Trace quality-review
   handoffs too.
4. **Apply the lenses** the diff reaches, labelling requirements and regression
   findings separately. A docs-only diff is reviewed against `docs/AGENTS.md`
   (the records guide): do the records agree with the code and each other, and
   is a status or acceptance claim true? Invent no other risk.
5. **Verify plausible findings** with a concrete trigger and an observed or
   code-derived failure path. Run a focused test, minimal reproduction or
   computed-style check when useful, outputs and caches under `/tmp`:
   `./node_modules/.bin/vitest related --run <files> --no-cache --fsModuleCachePath /tmp/<dir>`.
   Run binaries from `./node_modules/.bin/`, never through pnpm (`pnpm exec`
   or a `pnpm <script>`), which can reinstall the checkout's `node_modules`
   under the agent that shares it. Never run a command that changes state (a
   commit, a push, a deploy, a merge). Passing tests are evidence, not proof;
   never claim a check you only read.
6. **Filter.** Report defects the change introduces or materially exposes, tied
   to a changed line or affected contract, after ruling out an intentional
   exception. A rule ESLint, TypeScript strict or the i18n catalogue types
   already enforce (see _Tooling already enforces_) is not a finding unless the
   change disables or evades it. List an unrelated existing defect under
   _Handed off_. Drop hypothetical, preference-only and duplicate findings.

## Requirements

For each relevant requirement, distinguish implemented, partial, missing and
unverifiable; quote it for a mismatch and show the implementation path.

- Trace each scenario through every auth state (`initializing`, `ready`,
  `connecting`, `connected`, `expired`, `error`), width, language, theme and
  entry point it names (the header button, the hero button, a deep link, a
  reload) to the control the user meets, including what completes a branch that
  hands off or defers. Where a change replaces a surface, carried-over behavior
  may be what the story changes.
- Look for omitted refusal and expiry branches, empty and loading states, a
  failed read shown as "no results", an error shown as an empty list, mobile
  layouts that drop a control (below `sm` the header keeps only Disconnect, so
  every signed-out view needs its own Connect/Reconnect), and behavior beyond
  the request. Scope growth is a finding only when it creates a concrete risk
  or contradicts the request.

## Tooling already enforces

Do not spend findings on these; check only that the change does not evade them
(`eslint-disable`, `@ts-expect-error`, a cast, a moved file):

- **Layer imports** (`eslint.config.ts`, `no-restricted-imports`, `@/` and
  relative paths alike): `domain/` imports no framework, TanStack, UI/copy
  package or other layer; `infrastructure/` imports no React/TanStack/UI,
  `features`, `app`, `routes`, `components` or `i18n`; `features/` imports no
  `infrastructure`, `app` or `routes`; `components/` and `i18n/` import no
  `infrastructure`, `features`, `app` or `routes`; `lib/` imports no other
  layer.
- **The `google` global** (including `window.google`) outside
  `src/infrastructure/google-identity/`.
- **Literal copy**: `i18next/no-literal-string` rejects literal JSX text and
  literal `aria-label`, `title`, `alt`, `placeholder` and `label` attributes in
  `src/**/*.tsx` (not tests, `src/test/`, `components/ui/`). It does **not**
  cover `.ts` files, props other than those attributes, template strings, or
  strings built in hooks, so copy can still slip through.
- **Design tokens** (`build/design-token-lint.ts`, ADR-010): Tailwind's
  colours, type, radii and shadows, arbitrary design values, opacity tints,
  `dark:` colours, ad-hoc focus styles and design properties in inline styles
  or SVG paint attributes, in `src/**` (not tests). It reads classes only
  where the plugin looks by default (`className`, `cn()`, `cva()` …), in a
  `…Variants({ className })` call and in variables named `…Classes`, and
  styles only in a `style` attribute (which must hold an object literal) or
  an object typed `CSSProperties`. A class string held anywhere else, or a
  style object under another prop, is unchecked.
- `@typescript-eslint` strict-type-checked rules (no `any`, unsafe calls,
  floating promises, `unbound-method`), React Hooks rules and `jsx-a11y`
  basics. Catalogue parity is a `pnpm typecheck` error (`cy.ts` is
  `satisfies Catalogue<…>`), so a missing key does not need a finding, but a
  wrong or unnatural translation does not fail anything.

## Lenses

- **Every path to an invariant.** For each invariant the change relies on or
  alters (a layer boundary, the auth-scoped key root, the `enabled` gate, the
  token-in-memory rule, a feature's error mapping), enumerate every path that
  reaches it and show each one's handling: each caller that can raise
  `unauthenticated`, each query that fetches with the token, each place that
  reads `AuthState`, each test or fake naming a removed export.
- **Logic and contracts.** Trace branching, null/empty/zero values, boundaries,
  ordering, absent versus explicit-empty fields, and runtime response shapes
  against callers. Types prove neither the endpoint's answer nor the business
  decision (a Sheets response with no `sheets`, a hidden sheet, a zero-length
  title, an id that is not an integer); preserve intentional status and error
  mappings.
- **Layer and repository boundary (ADR-002).** UI, hooks and tests-of-UI speak
  `Roadmap`, `RoadmapRepository`, `AuthClient` and `AppError`, never
  spreadsheets, worksheets, ranges, `sheetId`, Google response types or
  statuses. The domain stays framework-free; `app/composition.ts` is the only
  importer of `@/infrastructure`. A change to `RoadmapRepository` or
  `AuthClient` updates every implementation (Sheets adapter, in-memory double,
  fake) and its shared contract test
  (`describeRoadmapRepositoryContract`), and a new adapter behavior is
  something a future HTTP API adapter could honour. No `fetch()` in components
  or hooks. A shortcut that lets a feature reach an adapter, or a Google
  detail leak into `Roadmap`, is a finding even where lint passes (a re-export
  or a barrel that sidesteps the rule).
- **Secrets and tokens (ADR-003).** The access token stays in memory: trace it
  from `getAccessToken()` to the request header and confirm it never reaches
  `localStorage`/`sessionStorage`/IndexedDB/cookies, a URL or hash, query keys
  or cached data, React state or context, an `AppError.message`/`cause`, a log
  or a toast. `AuthState` carries codes and `expiresAt`, not the token. Only
  non-sensitive preferences (language, theme) are stored. Check new
  `console.*`, error serialisation and `JSON.stringify` of anything holding a
  request. New Sheets/GIS scopes widen the consent screen: they need an ADR
  note and README update.
- **Untrusted data at the boundary.** Everything crossing out of Google (the
  GIS token response, the Sheets JSON, `error_callback` payloads) is parsed
  with Zod (`zod/mini`: `z.optional`, `z._default`, `x.check(…)`, `z.pipe`) in
  `infrastructure/` before it is trusted; `@types/google.accounts` is wrong at
  runtime (`expires_in`), so a typed cast is not parsing. Check that a bad
  shape becomes `invalid-response` (not a crash or a silent empty list), that
  unknown fields are stripped, that parsed values are range-checked (an
  `expires_in` of 0 or negative, an empty title), and that the requested
  `fields` mask matches what the schema reads.
- **Client and API agree.** Compare each client predicate with the API's actual
  behavior, both directions. Status mapping (401 `unauthenticated`, 403
  `forbidden`, 404 `not-found`, 429 `rate-limited`, 5xx retryable `unknown`,
  other `unknown`), which kinds are `retryable` against which controls the UI
  offers (Retry only when retryable, Reconnect for an expired session), what
  the repository drops (hidden sheets) against what a count or empty state
  says, ordering the UI assumes against what the API returns, and the scope the
  token was granted against the scope the call needs. An action offered for a
  state the API refuses, or a list that omits rows the user expects, is a
  defect; a control hidden for a state the API accepts is a defect only where
  the requirements have the UI offer it.
- **Auth state machine and session end (ADR-003).** Follow every transition
  the change touches: `connect()` from `ready`/`expired`/`error`, abandoned and
  late attempts (each attempt settles once; callbacks of any other attempt are
  ignored), `disconnect()` during `connecting`, the expiry timer firing 60 s
  early versus `getAccessToken()` returning `null` past `expiresAt`,
  `reportUnauthenticated()`, `lastError` codes, prompt policy (`''` from
  `expired`, `consent` after `scope-not-granted`), the script-load retry that
  needs a second click. Check timers and subscriptions are cleaned up and
  `dispose()` is reached (including HMR). A stale token must not be revoked
  (revocation also ends a newer grant for the same account).
- **Popup and user gesture.** `connect()` (and so `requestAccessToken()`) must
  run synchronously inside the click or key handler: any `await`, timeout,
  effect, `setState`-then-effect hop or prior async call before it gets the
  popup blocked. Trace the handler from the event, through wrappers such as
  `useAuth().connect` and `AuthButton`, to the GIS call.
- **A Product Lead's work is never lost or misrepresented.** For a change that
  edits roadmaps or roadmap items, trace a failed or partial publish,
  navigation away with pending edits, two tabs or two Product Leads on one
  roadmap, an expired session mid-edit, and a stale read overwriting a newer
  publish. Each ends with the edits kept or the loss stated, never silently
  dropped. Check that nothing reaches the data source before Publish, and that
  what the editor shows as published is what the data source holds.
- **The public site reads the same data.** The data source is shared with a
  separate public-site app, so a change to what is written, its shape or its
  location is a contract change: the record and PR must say so, and existing
  rows written before the change must still read correctly in both apps.
- **Server-state and caches (TanStack Query).** Query keys extend
  `authScopedQueryKey` (`roadmapKeys.all` does), so `disconnect()` drops them;
  a new authorised query outside that root survives a disconnect and leaks the
  last session's data. Check key identity (every input of the `queryFn` is in
  the key), `enabled` is tied to `connected`, `signal` is passed through to the
  repository, retries come only from `shouldRetryQuery` (retryable `AppError`s,
  at most 2; a per-query `retry` or a thrown non-`AppError` that gets retried
  is a finding), `select` stability (`useCallback`) and what `data: null`
  means for "not found". On session end the auth-scoped queries are cancelled,
  then invalidated with `refetchType: "none"`; `QueryCache.onError` maps
  `unauthenticated` to `reportUnauthenticated()` once per query. Verify new
  queries and mutations fit that flow, and that a mutation invalidates every
  query whose answer it changes (the list and anything derived from it).
  Repository abort rejects with `signal.reason`, not an `AppError`; code that
  catches errors must not turn an abort into an error state.
- **Async state and lifecycle.** Consider navigation A→B before A resolves,
  out-of-order responses, unmount, token expiry mid-request, reconnect during a
  fetch, retries with back-off (a 5xx or network error shows only after about
  3 s), duplicate submission and React StrictMode double effects (dev aborts and
  repeats the first fetch). Check effect dependencies, cleanup, and
  `useSyncExternalStore` snapshots (identity changes only on change; a
  selector returning a fresh object each call loops). Where a dialog, menu or
  pending action outlives the read that opened it, a refetch, expiry or route
  change must neither unmount it, swap the record it acts on, nor leave its
  copy stale.
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
  and `role=alert` usage, toasts), `aria-busy`, focus order and visible focus,
  focus management in `AppShell` (focus moves to `<main>` after in-app
  navigation, and when the focused control inside `<main>` is removed; the skip
  link focuses `<main>` because hash history owns the fragment), menu and dialog
  keyboard behavior, contrast in light and dark, 375 px layouts, 200% zoom and
  `prefers-reduced-motion`. Components under `components/ui/` stay close to
  upstream shadcn (Base UI flavour, no Radix); hand-rolled competing primitives
  are a finding.
- **Evidence covers less than its claim.** Where code or a test infers a fact
  from indirect evidence (a first fetch, a status badge, a fake that always
  grants, "all tests pass" when E2E was skipped, a Welsh string the author
  cannot read), name a realistic input that makes it lie, and check the code
  reads the effect itself or reports the result as unknown. The fakes agree
  with Google only as far as they were written to: a new Sheets or GIS call
  needs the fake extended, and the live behavior stays unverified (README's
  manual check).
- **Tests (ADR-006).** Vitest and Playwright specs exercise the failure path
  through real contracts and fail before a behavioral fix. Component tests go
  through `renderWithProviders` (real `AppProviders`, fake `AuthClient`,
  in-memory repository) and query by role and name, scoped to `main`/`banner`;
  adapters run the shared repository contract; deferred responses expose races
  immediate mocks hide; fake timers are paired with `vi.setSystemTime`. E2E
  imports from `./fixtures/test` only, uses the fakes (`gis`, `sheets`), has no
  sleeps, navigates with relative URLs, and extends the fakes rather than
  loosening the hermetic guard or the token-persistence recorder. Report tool
  diagnostics only if they mask a defect.

## Repo contracts

Read each where the diff reaches it; this skill does not restate them.

- Root `AGENTS.md`: _Layering rules_, _Conventions_, and the _Handoff log_
  (public APIs, state machines, E2E hooks and per-story gotchas).
- `docs/adr/`: 002 layers and the repository/`AuthClient` ports, 003 OAuth
  token model and session lifecycle, 004 hash-history routing, 005 UI stack,
  006 testing strategy, 007 Pages deployment and base path, 008
  internationalisation. A deviation updates or supersedes the ADR in the same
  change.
- `tests/e2e/AGENTS.md`: fixture API, hermetic guard and conventions.
- `docs/AGENTS.md`: the records guide, for backlog, ADR and run records.
- `docs/backlog/`: the story, defect or chore being delivered, with its
  acceptance criteria and status.

## Findings and grading

Give each finding every field of the report format below. State any
uncertainty; never present an unverified theory as an observed failure.

| Priority | Meaning                                                               |
| -------- | --------------------------------------------------------------------- |
| P0       | Immediate broadly applicable security/data-loss/outage defect         |
| P1       | Serious reachable failure that should block this change               |
| P2       | Concrete correctness defect with limited reach or an ordinary trigger |
| P3       | Minor but reproducible correctness issue                              |

A token written to storage or a URL, or one sent to another origin, is P0 or
P1. Choose priority from impact and reach, not from how strongly a rule is
worded. No quota: return no findings when no actionable defect is established.

## Report format

```text
Code review — <target>
Scope: <base/head SHAs, working-tree scope, diff command>
Requirements: <sources, coverage and unavailable requirements>
Verdict: <correctness assessment and any verification limits>

Requirements findings
- [P#] <title> — path:line
  Requirement: <quote/source>
  Trigger → failure: <concrete path and impact>
  Evidence: <code trace or actual check>
  Fix/test: <smallest useful correction and regression case; in a hand-written
  parser or scanner, first whether a structured tool (a Zod schema, a type, an
  existing linter, a parsed config) covering the same cases replaces it>

Regression findings
- <same evidence format, or None>

Verification: <checks actually run/read; relevant checks unavailable>
Handed off: <quality concerns or unrelated existing defects; or None>
```

When re-reviewing, state whether each earlier finding is fixed, still open or
unsupported, then review the changed scope. The implementer acts on findings as
`.agents/skills/implement-story/references/pull-requests.md` sets.
