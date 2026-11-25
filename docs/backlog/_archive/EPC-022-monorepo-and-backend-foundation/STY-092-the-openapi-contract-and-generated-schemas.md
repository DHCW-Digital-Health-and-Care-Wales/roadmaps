# STY-092: The OpenAPI contract and the editor's generated schemas

- **Status**: Done
- **Type**: Feature
- **Area**: API + Infrastructure + CI/CD
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: STY-090 (hard), STY-101 (hard)
- **Binding ADRs**: ADR-017 §Errors, §The contract with the editor, §STY-101 amendments,
  §STY-092 amendments; ADR-016 §Layout and name, §Workspace tooling, §STY-092 amendments;
  ADR-002
- **Suggested model**: Sonnet — generation, drift checks, lint boundary and error parser
  with settled tools and rules
- **Delivered**: https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps/pull/303

## Summary

The API's OpenAPI document is committed and checked for drift, and a shared workspace
package generates the editor's TypeScript types and `zod/mini` schemas from it, with no
build step. The editor's API infrastructure starts with an exhaustive error-code table
and a response-to-`AppError` parser that validates the envelope with the generated schema,
so adding an API error code breaks the editor's typecheck until it is mapped. `knip`
arrives to check unused files, exports and dependencies across the workspace. No API
routes, no new `AppErrorKind`s and no UI copy are added.

## Scope

The API's camelCase Pydantic request and response base models, OpenAPI error schema
injection (and stripping FastAPI's built-in 422 schema), and offline export and drift
check; the generated types workspace package using `@hey-api/openapi-ts`; the editor's
API error-mapping module under `infrastructure/` and its ESLint import boundary;
workspace-wide `knip`; CI path routing, drift and lint checks, pre-commit hook wiring,
root scripts and guides. No API route, no composition-root wiring and no public-site
runtime code changes.

## Acceptance criteria

### S1: The API's JSON wire format is strictly camelCase on requests and responses, and OpenAPI enumerates every error code

**Given** the API's FastAPI application and [errors.py](../../../../apps/api/src/roadmaps_api/errors.py)
**When** `app.openapi()` is built (or `/api/v1/openapi.json` is served locally)
**Then** two shared Pydantic base models enforce camelCase on the wire: `ApiResponseModel`
(`alias_generator=to_camel`, `serialize_by_alias=True`, `validate_by_alias=True`,
`validate_by_name=True`, so Python builds responses in `snake_case` while serialising
`camelCase`) and `ApiRequestModel` (`alias_generator=to_camel`, `serialize_by_alias=True`,
`validate_by_alias=True`, `validate_by_name=False`, which never binds `snake_case` keys on
inbound JSON bodies or `Annotated[Model, Query()]` query models: a required multi-word
field answers 422 `missing` at its camelCase alias, while an optional/defaulted field
ignores `snake_case` like any unknown key and keeps its default until `extra="forbid"` is
enabled alongside CHO-047 on the first request-body or query-model story); every model
reachable from a request, nested models included, inherits `ApiRequestModel`, plain
function query parameters use `Annotated[Model, Query()]` or an explicit `alias`, and
`ApiError.params` keeps camelCase keys by convention and tests (D1, D13, D17, D22)
**And** `components.schemas` includes `ErrorCode`, enumerating every value of
`roadmaps_api.errors.ErrorCode`, and `ErrorResponse` (`{detail, code, params}` with
`params` typed as a free-form object), while FastAPI's default `HTTPValidationError` and
`ValidationError` schemas are stripped and any generated 422 response ref points to
`ErrorResponse` (D2, D18)
**And** the live `/api/v1/openapi.json` served locally equals the document `app.openapi()`
produces, and `/health` and `/ready` remain excluded from `paths`

### S2: `apps/api/openapi.json` exports offline from fixed production settings and CI fails on OpenAPI drift

**Given** the API package, with no Docker container or running PostgreSQL required
**When** `pnpm api:openapi` and `pnpm api:openapi:check` run
**Then** `pnpm api:openapi` builds the app from one constant production-rule `Settings`
(credential-free placeholder database URL, fixed hosts, never reading `os.environ`) and
writes deterministic JSON to `apps/api/openapi.json` from a tool under `apps/api/tools/`
(covered under 100% branch coverage), succeeding with every `ROADMAPS_*` variable unset
and producing identical output under `ROADMAPS_ENV=local` (D3, D14, D21, D22)
**And** `pnpm api:openapi:check` passes when `apps/api/openapi.json` matches `app.openapi()`
and fails when any route or `ErrorCode` diverges, running in CI's `api-verify` job (D8)

### S3: `packages/api-types` generates committed raw TypeScript types and `zod/mini` schemas

**Given** `apps/api/openapi.json` and `packages/*` in `pnpm-workspace.yaml`
**When** `pnpm api-types:generate`, `pnpm api:contract` and `pnpm api-types:check` run
**Then** `@hey-api/openapi-ts` writes erasable TypeScript union types (`enums: false`) and
`zod/mini` schemas (`compatibilityVersion: "mini"`) only — no generated fetch client or
SDK — into `packages/api-types/src/generated/`, re-exported from
`packages/api-types/src/index.ts`, with no build step (D3, D4, D9)
**And** `pnpm api:contract` runs `api:openapi` then `api-types:generate` in sequence (D14)
**And** `pnpm api-types:check` compares the entire generated directory (added, changed and
removed files included, not `git diff --exit-code` alone) against what
`apps/api/openapi.json` generates and fails on any drift, running in CI's `repository`
job (D8, D14, D21)

### S4: Generated contract files stay ignored by Prettier and ESLint, and the package typechecks strictly

**Given** `apps/api/openapi.json` and `packages/api-types/`
**When** Prettier, ESLint, `lefthook` and `pnpm typecheck` run
**Then** `apps/api/openapi.json` and `packages/api-types/src/generated/` are ignored by
`.prettierignore` (matching `apps/editor/src/routeTree.gen.ts`), and
`packages/api-types/src/generated/` is ignored by ESLint, so formatting never fights the
drift checks (D9, D19)
**And** hand-written files in `packages/api-types/` (`openapi-ts.config.ts`,
`src/index.ts`) are formatted by Prettier and linted by a package-local ESLint config,
including in `lefthook.yml`'s pre-commit hook (D9, D10)
**And** `pnpm --filter @roadmaps/api-types typecheck` compiles the whole package under
`tsconfig.base.json` (`strict`, `erasableSyntaxOnly`, `exactOptionalPropertyTypes`,
`verbatimModuleSyntax`), running in `pnpm typecheck`, `lefthook`'s pre-push hook and CI's
`repository` job (D9, D10, D14)

### S5: The editor maps every API error code exhaustively and parses refusals at the boundary

**Given** `apps/editor/src/infrastructure/roadmaps-api/` importing from `@roadmaps/api-types`
**When** a non-2xx HTTP response is passed to the response-to-`AppError` parser
**Then** a JSON body matching the generated `zod/mini` `ErrorResponse` schema maps via one
exhaustive `Record<ApiErrorCode, …>` table: `request.not_found` → `not-found`
(non-retryable); `service.not_ready` and `server.internal_error` → `unknown` (retryable);
`request.invalid` and `request.method_not_allowed` → `unknown` (non-retryable) (D5)
**And** adding a new `ErrorCode` in Python and regenerating breaks the editor's typecheck
(`pnpm editor:typecheck`, and so CI's `editor-verify`) until the table maps it (ADR-017
_Errors_, D19)
**And** a non-envelope response or one carrying an unrecognised code falls back by HTTP
status: `401` → `unauthenticated`, `403` → `forbidden`, `404` → `not-found`, `429` →
`rate-limited`, `5xx` → retryable `unknown`, any non-envelope `400` or `413` (covering
STY-101's plain-text `400`/`413` and proxy HTML `413`s) → non-retryable `unknown`, and
any other malformed or unknown `4xx` or unexpected non-2xx outside `4xx`/`5xx` (`3xx`,
status `0`) → `invalid-response` (D5, D11, D20)
**And** no new `AppErrorKind`, no `AppError.params` and no UI copy in `en.ts` or `cy.ts`
are added (D5)

### S6: Only `apps/editor/src/infrastructure/` may import `@roadmaps/api-types`

**Given** `apps/editor/eslint.config.ts`
**When** ESLint checks `apps/editor/src/`
**Then** importing `@roadmaps/api-types`, any subpath of it, or a relative path into
`packages/api-types` fails lint in every file under `apps/editor/src/` except
`src/infrastructure/**`, applied inside every non-infrastructure `no-restricted-imports`
block so per-layer flat-config blocks never override it (D6, D20)
**And** a standing ESLint test proves the boundary rejects forbidden imports across every
non-infrastructure folder (`domain/`, `features/`, `components/`, `app/`, `routes/`,
`i18n/`, `lib/`, `test/`, `styles/`) and a `src/` root file (`src/vite-env.d.ts`),
including relative-path imports, while allowing `src/infrastructure/` (D16, D20, D22)

### S7: `knip` checks unused files, exports and dependencies across the workspace

**Given** `pnpm knip` configured at the root for the whole pnpm workspace (`apps/api`
ignored)
**When** `pnpm knip` runs locally and in CI's `repository` job
**Then** it checks unused files, exports and dependencies across the root package,
`apps/editor`, `apps/public-site` and `packages/api-types` (D7)
**And** `packages/api-types/src/generated/**` is exempt from unused-export checks, and
`apps/editor/src/infrastructure/roadmaps-api/index.ts` is listed as a temporary entry
point with a comment stating it stays only until `composeApp` wires `ApiRoadmapRepository`
in EPC-022 (D12, D20)
**And** any pre-existing dead files, exports or dependencies found on the first run are
cleaned up so `pnpm knip` passes cleanly (D7)

### S8: CI routes `packages/api-types/*` to the editor and API and keeps Git hooks fast

**Given** `.github/workflows/ci.yml`, `scripts/ci/classify-changes.sh` and `lefthook.yml`
**When** a pull request changes files under `packages/api-types/` alone
**Then** `classify-changes.sh` outputs `editor=true`, `site=false`, `api=true` (while an
unknown `packages/<other>/…` path still falls through to all three apps), held by rows in
`scripts/ci/classify-changes.test.ts`, so `editor-verify` and `api-verify` run without
the public site's jobs (D8, D21)
**And** `ci.yml`'s `repository` job runs `pnpm knip`, `@roadmaps/api-types` typecheck and
lint, and `pnpm api-types:check`, while `api-verify` runs `pnpm api:openapi:check` (D8,
D14)
**And** `lefthook.yml` runs neither `knip` nor contract drift checks (D10)

### S9: The records and guides agree with the build

**Given** the change
**When** ADR-017, ADR-016, `apps/api/AGENTS.md`, `apps/api/README.md`,
`apps/editor/AGENTS.md`, root `AGENTS.md`, `README.md`,
`docs/operations/replacing-google-sheets.md` and
`.agents/skills/implement-story/references/validation.md` are read
**Then** they record `ApiRequestModel` (including nested models reachable from a request)
and `ApiResponseModel`'s camelCase contract, `packages/api-types` and its import boundary,
`knip`, and the contract generation and drift-check commands and pre-PR gate steps

## Tests

Unit tests hold S1 (`ApiRequestModel` never binding `snake_case` on body and
`Annotated[Model, Query()]` query models — 422 `missing` on a required field and 200 with
the default retained on an optional field, plus a nested `ApiRequestModel` child;
`ApiResponseModel` building from `snake_case` and serialising `camelCase`; `app.openapi()`
including `ErrorCode` and `ErrorResponse` while stripping `HTTPValidationError` and
`ValidationError` on a validating test route), S2 (the export and drift-check tool under
`apps/api/tools/`, with every `ROADMAPS_*` variable unset and under `ROADMAPS_ENV=local`,
at 100% branch coverage), S3 (full-directory `packages/api-types` drift check covering
added, changed and removed files), S5 (one table-driven suite asserting both kind and
retryability for every known `ErrorCode`, plain-text `400`/`413`, HTML proxy `413`, edge
`401`/`403`/`404`/`429`/`5xx`, malformed JSON, unknown `ErrorCode`, and non-2xx outside
`4xx`/`5xx`), S6 (a standing ESLint wiring test across every non-infrastructure folder,
`src/vite-env.d.ts`, relative-path imports and `src/infrastructure/`), and S8
(`scripts/ci/classify-changes.test.ts` rows for `packages/api-types/*` and an unknown
`packages/<other>/…`). Per CHO-048, S5's compile-time failure of `pnpm editor:typecheck`
on an unmapped `ErrorCode` and S7's `knip` detection of a planted unused export/file are
held by observed planted-violation runs in Scenario evidence.

## Decisions

- **D1** (owner, 2026-11-24, STY-092 grilling round 1 Q1): `camelCase` across the whole
  API JSON contract (bodies, query params and error `params`) via a shared Pydantic base
  model, over error `params` alone or `snake_case` everywhere. Refined by D17. Gives S1.
- **D2** (owner, round 1 Q2): inject `ErrorCode` (enum) and one `ErrorResponse`
  (`{detail, code, params: Record<string, unknown>}`) into `components.schemas` (and serve
  the same from local `/api/v1/openapi.json`), over per-code discriminated unions or
  attaching default 4xx/5xx responses to every route. Refined by D18. Gives S1.
- **D3** (owner, round 1 Q3): commit both `apps/api/openapi.json` and raw TypeScript in
  `packages/api-types/src/generated/` with no build step, checked for drift in CI, over
  build-time generation or compiling to `dist/`. Keeps ADR-016's "no package builds".
  Gives S2, S3.
- **D4** (owner, round 1 Q4): `@hey-api/openapi-ts` generates TypeScript types and
  `zod/mini` schemas only, with no generated fetch client/SDK, matching ADR-017 and
  `docs/operations/replacing-google-sheets.md`. Gives S3.
- **D5** (owner, round 1 Q5): map all 5 skeleton codes and STY-101's plain-text `400`/`413`
  onto existing `AppErrorKind`s (`request.not_found` → `not-found`; `service.not_ready`
  and `server.internal_error` → retryable `unknown`; `request.invalid`,
  `request.method_not_allowed`, `400` and `413` → non-retryable `unknown`), with a
  response-to-`AppError` parser using the generated `zod/mini` schema; defer new
  `AppErrorKind`s and `AppError.params` until copy needs them. Gives S5.
- **D6** (owner, round 1 Q6): forbid `@roadmaps/api-types` everywhere in `apps/editor/src/`
  except `src/infrastructure/**` (covering `domain/`, `features/`, `components/`, `app/`,
  `routes/`, `i18n/`, `lib/`), over restricting only the existing `layers()` folders.
  Refined by D20. Gives S6.
- **D7** (owner, round 1 Q7): run `knip` across the whole pnpm workspace (root,
  `apps/editor`, `apps/public-site`, `packages/api-types`; ignoring `apps/api`) in CI's
  `repository` job, checking unused files, exports and dependencies, and clean up any
  pre-existing dead code found now. Gives S7.
- **D8** (owner, round 2 Q8): route `packages/api-types/*` to `editor=true`, `api=true`,
  `site=false` in `classify-changes.sh` (until the public site adopts the API), over
  falling through to all three apps or a dedicated Contract job; check OpenAPI drift in
  `api-verify` and `packages/api-types` drift in `repository`. Gives S2, S3, S8.
- **D9** (owner, round 2 Q9): ignore `packages/api-types/src/generated/` in `.prettierignore`
  and ESLint (matching `routeTree.gen.ts`), format/lint hand-written files in
  `packages/api-types/`, and typecheck the whole package under `tsconfig.base.json`, over
  running Prettier in the generator or skipping package typecheck. Refined by D19. Gives
  S3, S4.
- **D10** (owner, round 2 Q10): keep `lefthook.yml` fast (add ESLint on pre-commit for
  hand-written `packages/api-types/*.ts`; pre-push `pnpm typecheck` already covers
  `packages/api-types`), running `knip` and contract drift checks in CI and the pre-PR
  gate, over adding `knip` or drift checks to pre-push. Gives S4, S8.
- **D11** (owner, round 2 Q11): in the editor's response-to-`AppError` parser, validate
  with the generated `zod/mini` `ErrorResponse` schema first, then fall back by HTTP
  status (`401` → `unauthenticated`, `403` → `forbidden`, `404` → `not-found`, `429` →
  `rate-limited`, `5xx` → retryable `unknown`, plain-text `400`/`413` → non-retryable
  `unknown`, any other malformed/unknown `4xx` → `invalid-response`), over strict
  envelope-only or `429`/`5xx`-only fallback. Refined by D20. Gives S5.
- **D12** (owner, round 2 Q12): exempt `packages/api-types/src/generated/**` from `knip`'s
  unused-export check, and list `apps/editor/src/infrastructure/roadmaps-api/index.ts` as
  a temporary `knip` entry point, over ignoring all of `roadmaps-api/` or failing on
  unconsumed generated schemas. Refined by D20. Gives S7.
- **D13** (owner, round 2 Q13): one `ApiModel` base with `validate_by_name=True`, leaving
  `extra="forbid"` to the first request-body story alongside CHO-047, over splitting
  request/response bases or pulling CHO-047 in now. Superseded on the single-base split
  by D17 (while keeping `extra="forbid"` deferred to CHO-047, recorded in CHO-047 D2).
- **D14** (owner, 2026-11-24, confirming the grilling's summary): package name
  `@roadmaps/api-types`; root scripts `api:openapi`, `api:openapi:check`,
  `api-types:generate`, `api-types:check`, `api:contract` and `knip`; CI's `repository`
  job runs `knip`, `@roadmaps/api-types` typecheck and lint, and `api-types:check` once
  (no duplication in `api-verify`). Gives S2, S3, S4, S8.
- **D15** (owner, confirming the summary): STY-092 depends on STY-090 and STY-101 (both
  done), making it selectable immediately.
- **D16** (owner, confirming the summary): standing ESLint test for the `@roadmaps/api-types`
  boundary wiring, and observed planted-violation runs for `knip` and TypeScript's
  unmapped-`ErrorCode` failure (CHO-048). Gives S6, Tests.
- **D17** (owner, 2026-11-24, review question R1, security review): split into
  `ApiResponseModel` (`validate_by_name=True`) and `ApiRequestModel`
  (`validate_by_name=False`, rejecting `snake_case` on inbound JSON bodies and
  `Annotated[Model, Query()]` query models), over one `ApiModel` base that accepted
  undocumented `snake_case` spellings on the wire (which risked Cloud CDN cache-key
  discrepancies on public-read query parameters); `extra="forbid"` stays deferred to
  CHO-047 and the first request-body story (CHO-047 D2). Refines D1, D13; refined by D22.
  Changes S1.
- **D18** (owner, 2026-11-24, review question R2, security review): strip FastAPI's
  built-in `HTTPValidationError` and `ValidationError` schemas in `app.openapi()` and
  point generated 422 response refs to `ErrorResponse`, over leaving FastAPI's default
  until the first validating route story, so OpenAPI never documents a refusal shape
  (`input`, `msg`, `ctx`) the API never emits (ADR-020). Refines D2. Changes S1.
- **D19** (agent, 2026-11-24, round 1 correctness reviews): add `apps/api/openapi.json` to
  `.prettierignore` alongside `packages/api-types/src/generated/` (Prettier collapses
  Python `json.dumps` arrays and would fight `api:openapi:check`), and narrow S5 from
  "editor's build" to `pnpm editor:typecheck` (`apps/editor`'s `vite build` strips types
  without running `tsc -b`). Refines D9. Changes S4, S5.
- **D20** (agent, 2026-11-24, round 1 correctness and security reviews): apply the
  `@roadmaps/api-types` restriction (including relative paths into `packages/api-types`)
  inside every non-infrastructure `no-restricted-imports` block rather than a `google`-style
  block (which flat-config layer blocks would override); define S5's `400`/`413` fallback
  by status for any non-envelope `400`/`413` and map unexpected non-2xx outside `4xx`/`5xx`
  to `invalid-response`; name the removal condition in S7's temporary `knip` comment
  rather than an unwritten adapter story ID. Refines D6, D11, D12. Changes S5, S6, S7.
- **D21** (agent, 2026-11-24, round 1 security review): build the offline OpenAPI export
  from one constant production-rule `Settings` (never reading `os.environ`, tested under
  `ROADMAPS_ENV=local`), compare the entire generated directory in `api-types:check`
  (added, changed and removed files), and keep an unknown `packages/<other>/…` fall-through
  row in `classify-changes.test.ts`. Refined by D22. Changes S2, S3, S8.
- **D22** (agent, 2026-11-24, after the review cap, round 2 re-checks): narrow S1/Tests
  to Pydantic's actual `validate_by_name=False` behaviour without `extra="forbid"`
  (required multi-word fields return 422 `missing` at their camelCase alias; optional
  fields ignore `snake_case` and keep their default until CHO-047 enables `extra="forbid"`
  on the first request-body or query-model story); require nested models reachable from a
  request to inherit `ApiRequestModel` too; test S2 export with every `ROADMAPS_*` unset;
  replace nonexistent `src/main.tsx` with `src/vite-env.d.ts` in S6/Tests (the editor's
  entry is `src/app/main.tsx`, and `projectService: true` rejects nonexistent paths).
  Changes S1, S2, S6, Tests.
- **D23** (owner, 2026-11-25, CHO-047 D4): CHO-047 turns `extra="forbid"` on for
  `ApiRequestModel`, ahead of the first request-body or query-model story, so a key a
  request model does not declare, a `snake_case` one among them, is refused. Refines
  D13, D17 and D22. Changes S1.

## Starting point

Audited at `977a632d`:

- `apps/api/src/roadmaps_api/app.py` currently emits `{"openapi": "3.1.0", "info": {"title": "DHCW Roadmaps API", "version": "0.1.0"}, "paths": {}}` because `probes.router` has `include_in_schema=False` and `api_v1.router` has no routes; `create_app` constructs a lazy SQLAlchemy engine and never connects during `app.openapi()`, so export runs offline without Docker.
- Installed Python packages: Pydantic `2.14.3` (`ConfigDict` supports `alias_generator`, `serialize_by_alias`, `validate_by_alias`, `validate_by_name`) and FastAPI `0.163.1`. `pydantic` is currently transitive through FastAPI; declare it directly in `apps/api/pyproject.toml` once `ApiRequestModel`/`ApiResponseModel` import it directly.
- Available npm releases passing `pnpm-workspace.yaml`'s 7-day `minimumReleaseAge` (as of 2026-11-24): `@hey-api/openapi-ts` `0.99.0` (2026-06-22, supports `enums: false` and `zod` plugin `compatibilityVersion: "mini"` emitting `import * as z from "zod/mini"` for Zod 4) and `knip` `6.45.1` (2026-11-11).
- `pnpm-workspace.yaml` currently lists `apps/*` only (`packages/*` must be added) and already has `zod: ^4.6.7` in `catalog:`.
- Root `eslint.config.ts` sets `globalIgnores(["apps"])` — extend it to ignore `packages` and give `packages/api-types/` its own `eslint.config.ts` (matching `apps/*` and `lefthook.yml`'s per-package pattern).
- `build/agent-guides.test.ts`'s `REPO_ROOT_PREFIX` does not yet include `packages/`; add it when guides reference `packages/api-types/`.
- `apps/api/pyproject.toml` sets `coverage.run.source = ["src/roadmaps_api", "tools"]` with `fail_under = 100` (branch coverage), so any OpenAPI export/check script under `apps/api/tools/` must hold 100% branch coverage.

## Out of scope

- Any `/api/v1` endpoints or domain schemas: the schema and endpoint stories in EPC-022.
- Wiring `ApiRoadmapRepository` into `composeApp` and removing the temporary `knip` entry
  for `apps/editor/src/infrastructure/roadmaps-api/index.ts`: the later EPC-022 work that
  adds the editor's API adapter.
- New `AppErrorKind`s, `AppError.params` and English/Welsh copy for API-specific refusals:
  the first route story whose refusal needs distinct user-facing copy.
- `extra="forbid"` on `ApiRequestModel` and stripping caller-chosen keys from 422 `loc`
  arrays: CHO-047 (its D2) and the first request-body story.
- Using `@roadmaps/api-types` in `apps/public-site` (and routing `packages/api-types/*`
  to `site=true` in `classify-changes.sh`): outside EPC-022, when the public site moves to
  the API read.

## Delivery

### Departures

- **S6: `import()` and `import("…")` types need a rule of the app's own** (agent):
  `no-restricted-imports`, in every non-infrastructure block as S6 says, reads neither,
  so `api-types/no-deferred-import` (`apps/editor/build/api-types-lint.ts`) holds them.
  An existing rule would not do: `no-restricted-syntax` is the design tokens' on the
  same files, and flat config lets one block's options replace another's. A specifier
  built at run time, and Vite's `import.meta.glob`, are not read. The layering rules
  miss the same two forms (DEF-035).
- **S6: a path is matched by its `api-types` segment** (agent, from review): matching
  `packages/api-types` as text let through spellings that resolve to the same folder
  (`packages/./api-types`, `packages//api-types`, `packages/x/../api-types`), so both
  rules refuse any specifier with an `api-types` segment, one with a query or fragment
  (`?raw`) or text a template builds onto it included; no folder of the editor's own
  takes that name. Like every layering rule, they read `.ts` and `.tsx` files, the only
  ones under `src/` (DEF-037).
- **S3, S4: three more root scripts, and the generator's own update** (agent, from
  review and the epic's _Workspace commands_): `api-types:typecheck`, `api-types:lint`
  and `api-types:test` beside the ones D14 names, which CI and the pre-PR gate run; and
  Dependabot proposes `@hey-api/openapi-ts` on its own, outside the grouped pnpm
  update, since its bump can need the source regenerated.
- **S7: one test moved so that `knip` sees unused files** (agent):
  `lint-exceptions.test.ts` read every module with `import.meta.glob`, which `knip`
  counts as importing them, so no file under the editor's `src/` could be reported
  unused. It is now `apps/editor/build/lint-exceptions.test.ts`, reading from disk.
- **S7: what the first run found** (agent, from D7): unused shadcn parts removed
  (among them the whole submenu, its open-state styling noted in
  `dropdown-menu.tsx` for whoever adds one back), `ROADMAP_HORIZONS` (ADR-011's code
  sketch still shows it), `useHeldWrite`, the `TagVariant` type, unused barrel
  re-exports, a second declaration of `RoadmapCopiedCells` that TypeScript merged, and
  `export` on names only their own module uses. `knip.jsonc` also names the skills'
  scripts as entry points, leaves the design-token lint fixtures out, and keeps
  `dhcw-design-system`, whose Sass the token tests read from `node_modules` by path.
- **S3: the package has its own tests** (agent): the drift check's cases are
  `packages/api-types/scripts/contract.test.ts`, which CI's Repository job runs beside
  the steps D14 names. `@hey-api/openapi-ts` is pinned exactly, since a release can
  change what it writes and so fail the drift check. It writes `.ts` import
  extensions and reads no `tsconfig.json`, so a copy generated anywhere is the same.
  `src/index.ts` re-exports the generated types' index and `zod.gen.ts`. Its parser
  pins a `js-yaml` with known denials of service, which `pnpm-workspace.yaml`'s
  overrides raise to 4.3.2.

### Contract for dependents

- A story that adds a route, a wire model or an `ErrorCode` runs `pnpm api:contract`
  and commits what it writes; a new code also maps it in `BY_CODE`
  (`apps/editor/src/infrastructure/roadmaps-api/api-error.ts`).
- `toApiError(response)` takes any non-2xx answer and resolves with an `AppError`
  holding the status and never the body's text. It also resolves when the body cannot
  be read, an aborted request's included, so the adapter's client checks its signal
  afterwards.
- The adapter story removes `knip.jsonc`'s temporary entry for
  `src/infrastructure/roadmaps-api/index.ts` once `composeApp` imports it, and
  exports what it adds from that barrel.
- The generated `zod/mini` objects drop unknown keys rather than refusing them.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                                  |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `apps/api/tests/test_wire.py` (bound and missing names, a row per body, query and nested case; the response model), `apps/api/tests/test_openapi.py` (the schemas, the 422 ref and FastAPI's schemas gone, the local live document), `apps/api/tests/test_errors.py` (every refusal's `params` keys are camelCase); red against empty base models and an unshaped document                               |
| S2       | `apps/api/tests/test_export_openapi.py` (no `ROADMAPS_*` set and `ROADMAPS_ENV=local`; a row per divergence; a missing file; the module run as CI runs it); red against a stub tool; observed: `env -i`, with and without `ROADMAPS_ENV=local`, `--check` exited 0; a planted `ErrorCode` failed `pnpm api:openapi:check`                                                                                |
| S3       | `packages/api-types/scripts/contract.test.ts` (added, changed and removed files, a diverging document, an unreadable one, the CLI's exit codes); red with each branch of the comparison broken, without recursion, without the empty-result guard and with exit 0; observed: after the planted code's export and before generating, `pnpm api-types:check` failed naming `types.gen.ts` and `zod.gen.ts` |
| S4       | `.prettierignore`, `packages/api-types/eslint.config.ts` and `tsconfig.json`, `lefthook.yml`; `pnpm format:check` and the package's `typecheck` and `lint` in the gate                                                                                                                                                                                                                                   |
| S5       | `apps/editor/src/infrastructure/roadmaps-api/api-error.test.ts` (every code, the envelope over the status, each fallback, no body text in the error); red against a stub parser; observed: a planted Python `ErrorCode`, after `pnpm api:contract`, failed `pnpm editor:typecheck` with TS2741 at `BY_CODE` and at the test's table                                                                      |
| S6       | `apps/editor/build/api-types-lint.test.ts` (every folder but infrastructure, and `src/vite-env.d.ts`; static, relative, `import()` and `import("…")` forms; allowed in infrastructure); red before the rules, without each rule, without the relative-path pattern, and with the features block not carrying it                                                                                          |
| S7       | observed: a planted unused export in the editor and the public site and a planted unused dependency in the package failed `pnpm knip`, naming each; a planted unused file in each workspace and root folder (seven) was reported as an unused file; with them removed it passed                                                                                                                          |
| S8       | `scripts/ci/classify-changes.test.ts` (the package's paths, another package, a package whose name starts the same); red without the case, without either app and with it widened to `packages/*`; `.github/workflows/ci.yml`, `lefthook.yml`                                                                                                                                                             |
| S9       | `apps/api/AGENTS.md`, `apps/api/README.md`, `apps/editor/AGENTS.md`, `apps/editor/README.md`, `AGENTS.md`, `README.md`, `docs/operations/replacing-google-sheets.md`, `.agents/skills/implement-story/references/validation.md`; ADR-016's and ADR-017's _STY-092 amendments_ (unchanged), which state what the build does                                                                               |
