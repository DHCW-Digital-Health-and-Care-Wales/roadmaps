# STY-092: The OpenAPI contract and the editor's generated schemas

- **Status**: Proposed — acceptance criteria from the owner's STY-092 grilling
  (2026-11-24); selectable now (STY-090 and STY-101 are done)
- **Type**: Feature
- **Area**: API + Infrastructure + CI/CD
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: STY-090 (hard), STY-101 (hard)
- **Binding ADRs**: ADR-017 §Errors, §The contract with the editor, §STY-101 amendments,
  §STY-092 amendments; ADR-016 §Layout and name, §Workspace tooling, §STY-092 amendments;
  ADR-002
- **Suggested model**: Sonnet — generation, drift checks, lint boundary and error parser
  with settled tools and rules

## Summary

The API's OpenAPI document is committed and checked for drift, and `packages/api-types`
generates the editor's TypeScript types and `zod/mini` schemas from it, with no build
step. The editor's API adapter starts with an exhaustive error-code table and a
response-to-`AppError` parser that validates the envelope with the generated schema, so
adding an API error code breaks the editor's build until it is mapped. `knip` arrives to
check unused files, exports and dependencies across the workspace. No API routes, no new
`AppErrorKind`s and no UI copy are added.

## Scope

The API's shared camelCase Pydantic base model (`ApiModel`), OpenAPI error schema
injection and offline export/drift tool; the `@roadmaps/api-types` workspace package
(`packages/api-types/`) with `@hey-api/openapi-ts`; the editor's error-mapping module
under `apps/editor/src/infrastructure/roadmaps-api/` and its ESLint import boundary;
workspace-wide `knip`; `classify-changes.sh`, `ci.yml`, `lefthook.yml`, `.prettierignore`,
root scripts and guides. No API route, no `composeApp` wiring and no public-site runtime
code changes.

## Acceptance criteria

### S1: The API's JSON wire format is camelCase and OpenAPI enumerates every error code

**Given** the API's FastAPI application and [errors.py](../../../apps/api/src/roadmaps_api/errors.py)
**When** `app.openapi()` is built (or `/api/v1/openapi.json` is served locally)
**Then** the shared `ApiModel` base (`alias_generator=to_camel`, `serialize_by_alias=True`,
`validate_by_alias=True`, `validate_by_name=True`, without `extra="forbid"`, which waits
for CHO-047) emits camelCase JSON and OpenAPI field names while accepting snake_case
kwargs in Python (D1, D13)
**And** `components.schemas` includes `ErrorCode`, enumerating every value of
`roadmaps_api.errors.ErrorCode`, and `ErrorResponse` (`{detail, code, params}` with
`params` typed as a free-form object) (D2)
**And** the live `/api/v1/openapi.json` served locally equals the document `app.openapi()`
produces, and `/health` and `/ready` remain excluded from `paths`

### S2: `apps/api/openapi.json` exports offline and CI fails on OpenAPI drift

**Given** the API package, with no Docker container or running PostgreSQL required
**When** `pnpm api:openapi` and `pnpm api:openapi:check` run
**Then** `pnpm api:openapi` writes deterministic JSON to `apps/api/openapi.json` from a
tool under `apps/api/tools/` (covered under 100% branch coverage) (D3, D14)
**And** `pnpm api:openapi:check` passes when `apps/api/openapi.json` matches `app.openapi()`
and fails when any route or `ErrorCode` diverges, running in CI's `api-verify` job (D8)

### S3: `packages/api-types` generates committed raw TypeScript types and `zod/mini` schemas

**Given** `apps/api/openapi.json` and `packages/*` in `pnpm-workspace.yaml`
**When** `pnpm api-types:generate`, `pnpm api:contract` and `pnpm api-types:check` run
**Then** `@hey-api/openapi-ts` writes erasable TypeScript union types (`enums: false`) and
`zod/mini` schemas (`compatibilityVersion: "mini"`) only — no generated fetch client or
SDK — into `packages/api-types/src/generated/`, re-exported from `packages/api-types/src/index.ts`,
with no build step (D3, D4, D9)
**And** `pnpm api:contract` runs `api:openapi` then `api-types:generate` in sequence (D14)
**And** `pnpm api-types:check` fails on any drift between committed
`packages/api-types/src/generated/` and what `apps/api/openapi.json` generates, running
in CI's `repository` job (D8, D14)

### S4: Generated files stay ignored by Prettier and ESLint, and the package typechecks strictly

**Given** `packages/api-types/`
**When** Prettier, ESLint, `lefthook` and `pnpm typecheck` run
**Then** `packages/api-types/src/generated/` is ignored by `.prettierignore` and ESLint
(matching `apps/editor/src/routeTree.gen.ts`), so formatting never fights the drift check
(D9)
**And** hand-written files in `packages/api-types/` (`openapi-ts.config.ts`, `src/index.ts`)
are formatted by Prettier and linted by ESLint, including in `lefthook.yml`'s pre-commit
hook (D9, D10)
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
and build until the table maps it (ADR-017 _Errors_)
**And** a non-envelope response or one carrying an unrecognised code falls back by HTTP
status: `401` → `unauthenticated`, `403` → `forbidden`, `404` → `not-found`, `429` →
`rate-limited`, `5xx` → retryable `unknown`, plain-text `400` or `413` (STY-101) →
non-retryable `unknown`, and any other malformed or unknown `4xx` → `invalid-response`
(D5, D11)
**And** no new `AppErrorKind`, no `AppError.params` and no UI copy in `en.ts` or `cy.ts`
are added (D5)

### S6: Only `apps/editor/src/infrastructure/` may import `@roadmaps/api-types`

**Given** `apps/editor/eslint.config.ts`
**When** ESLint checks `apps/editor/src/`
**Then** importing `@roadmaps/api-types` (or any subpath of it) fails lint in every folder
under `apps/editor/src/` except `src/infrastructure/**` (`domain/`, `features/`,
`components/`, `app/`, `routes/`, `i18n/`, `lib/`), matching the `google`-global rule (D6)
**And** a standing ESLint test proves the boundary rejects forbidden layers and allows
`src/infrastructure/` (D16)

### S7: `knip` checks unused files, exports and dependencies across the workspace

**Given** `pnpm knip` configured at the root for the whole pnpm workspace (`apps/api`
ignored)
**When** `pnpm knip` runs locally and in CI's `repository` job
**Then** it checks unused files, exports and dependencies across the root package,
`apps/editor`, `apps/public-site` and `packages/api-types` (D7)
**And** `packages/api-types/src/generated/**` is exempt from unused-export checks, and
`apps/editor/src/infrastructure/roadmaps-api/index.ts` is listed as a temporary entry
point with a comment naming the API adapter story that removes it (D12)
**And** any pre-existing dead files, exports or dependencies found on the first run are
cleaned up so `pnpm knip` passes cleanly (D7)

### S8: CI routes `packages/api-types/*` to the editor and API and keeps Git hooks fast

**Given** `.github/workflows/ci.yml`, `scripts/ci/classify-changes.sh` and `lefthook.yml`
**When** a pull request changes files under `packages/api-types/` alone
**Then** `classify-changes.sh` outputs `editor=true`, `site=false`, `api=true` (held by
rows in `scripts/ci/classify-changes.test.ts`), so `editor-verify` and `api-verify` run
without the public site's jobs (D8)
**And** `ci.yml`'s `repository` job runs `pnpm knip`, `@roadmaps/api-types` typecheck and
lint, and `pnpm api-types:check`, while `api-verify` runs `pnpm api:openapi:check` (D8,
D14)
**And** `lefthook.yml` runs neither `knip` nor contract drift checks (D10)

### S9: The records and guides agree with the build

**Given** the change
**When** ADR-017, ADR-016, `apps/api/AGENTS.md`, `apps/editor/AGENTS.md`, root `AGENTS.md`,
`README.md`, `docs/operations/replacing-google-sheets.md` and
`.agents/skills/implement-story/references/validation.md` are read
**Then** they record `ApiModel`'s camelCase contract, `packages/api-types` and its import
boundary, `knip`, and the contract generation and drift-check commands and pre-PR gate
steps

## Tests

Unit tests hold S1 (`ApiModel` camelCase serialisation/validation and `app.openapi()`
`ErrorCode`/`ErrorResponse` schemas), S2 (the export and drift-check tool under
`apps/api/tools/`, at 100% branch coverage), S3 (the `packages/api-types` drift check),
S5 (one table-driven suite for every known `ErrorCode`, plain-text `400`/`413`, edge
`401`/`403`/`404`/`429`/`5xx`, malformed JSON and unknown `ErrorCode`), S6 (a standing
ESLint wiring test for the `@roadmaps/api-types` boundary), and S8
(`scripts/ci/classify-changes.test.ts` rows for `packages/api-types/*`). Per CHO-048, S5's
compile-time failure on an unmapped `ErrorCode` and S7's `knip` detection of a planted
unused export/file are held by observed planted-violation runs in Scenario evidence.

## Decisions

- **D1** (owner, 2026-11-24, STY-092 grilling round 1 Q1): `camelCase` across the whole
  API JSON contract (bodies, query params and error `params`) via a shared Pydantic base
  model (`ApiModel`), over error `params` alone or `snake_case` everywhere. Gives S1.
- **D2** (owner, round 1 Q2): inject `ErrorCode` (enum) and one `ErrorResponse`
  (`{detail, code, params: Record<string, unknown>}`) into `components.schemas` (and serve
  the same from local `/api/v1/openapi.json`), over per-code discriminated unions or
  attaching default 4xx/5xx responses to every route. Gives S1.
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
  `routes/`, `i18n/`, `lib/`), matching the `google`-global rule, over restricting only
  the existing `layers()` folders. Gives S6.
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
  running Prettier in the generator or skipping package typecheck. Gives S3, S4.
- **D10** (owner, round 2 Q10): keep `lefthook.yml` fast (add ESLint on pre-commit for
  hand-written `packages/api-types/*.ts`; pre-push `pnpm typecheck` already covers
  `packages/api-types`), running `knip` and contract drift checks in CI and the pre-PR
  gate, over adding `knip` or drift checks to pre-push. Gives S4, S8.
- **D11** (owner, round 2 Q11): in the editor's response-to-`AppError` parser, validate
  with the generated `zod/mini` `ErrorResponse` schema first, then fall back by HTTP
  status (`401` → `unauthenticated`, `403` → `forbidden`, `404` → `not-found`, `429` →
  `rate-limited`, `5xx` → retryable `unknown`, plain-text `400`/`413` → non-retryable
  `unknown`, any other malformed/unknown `4xx` → `invalid-response`), over strict
  envelope-only or `429`/`5xx`-only fallback. Gives S5.
- **D12** (owner, round 2 Q12): exempt `packages/api-types/src/generated/**` from `knip`'s
  unused-export check, and list `apps/editor/src/infrastructure/roadmaps-api/index.ts` as
  a temporary `knip` entry point with a comment naming the API adapter story that removes
  it, over ignoring all of `roadmaps-api/` or failing on unconsumed generated schemas.
  Gives S7.
- **D13** (owner, round 2 Q13): one `ApiModel` base with `validate_by_name=True` (so
  Python constructs models in snake_case while OpenAPI and JSON responses are camelCase),
  leaving `extra="forbid"` to the first request-body story alongside CHO-047, over
  splitting request/response bases or pulling CHO-047 in now. Gives S1.
- **D14** (owner, 2026-11-24, confirming the grilling's summary): package name
  `@roadmaps/api-types`; root scripts `api:openapi`, `api:openapi:check`,
  `api-types:generate`, `api-types:check`, `api:contract` and `knip`; CI's `repository`
  job runs `knip`, `@roadmaps/api-types` typecheck and lint, and `api-types:check` once
  (no duplication in `api-verify`). Gives S2, S3, S4, S8.
- **D15** (owner, confirming the summary): STY-092 depends on STY-090 and STY-101 (both
  done), making it selectable immediately.
- **D16** (owner, confirming the summary): standing ESLint test for the `@roadmaps/api-types`
  boundary wiring, and observed planted-violation runs for `knip` and TypeScript's
  unmapped-`ErrorCode` build failure (CHO-048). Gives S6, Tests.

## Starting point

Audited at `977a632d`:

- `apps/api/src/roadmaps_api/app.py` currently emits `{"openapi": "3.1.0", "info": {"title": "DHCW Roadmaps API", "version": "0.1.0"}, "paths": {}}` because `probes.router` has `include_in_schema=False` and `api_v1.router` has no routes; `create_app` constructs a lazy SQLAlchemy engine and never connects during `app.openapi()`, so export runs offline without Docker.
- Installed Python packages: Pydantic `2.14.3` (`ConfigDict` supports `alias_generator`, `serialize_by_alias`, `validate_by_alias`, `validate_by_name`) and FastAPI `0.163.1`.
- Available npm releases passing `pnpm-workspace.yaml`'s 7-day `minimumReleaseAge` (as of 2026-11-24): `@hey-api/openapi-ts` `0.99.0` (2026-06-22, supports `enums: false` and `zod` plugin `compatibilityVersion: "mini"` emitting `import * as z from "zod/mini"` for Zod 4) and `knip` `6.45.1` (2026-11-11).
- `pnpm-workspace.yaml` currently lists `apps/*` only (`packages/*` must be added) and already has `zod: ^4.6.7` in `catalog:`.
- Root `eslint.config.ts` currently sets `globalIgnores(["apps"])`, so adding `packages/` requires either its own package ESLint config (with `packages` ignored at root, matching `apps`) or an explicit root rule.
- `apps/api/pyproject.toml` sets `coverage.run.source = ["src/roadmaps_api", "tools"]` with `fail_under = 100` (branch coverage), so any OpenAPI export/check script under `apps/api/tools/` must hold 100% branch coverage.

## Out of scope

- Any `/api/v1` endpoints or domain schemas: the schema and endpoint stories in EPC-022.
- Wiring `ApiRoadmapRepository` into `composeApp` or removing the temporary `knip` entry
  for `apps/editor/src/infrastructure/roadmaps-api/index.ts`: the editor's API adapter
  story in EPC-022.
- New `AppErrorKind`s, `AppError.params` and English/Welsh copy for API-specific refusals:
  the first route story whose refusal needs distinct user-facing copy.
- `extra="forbid"` on incoming request models and stripping caller-chosen keys from 422
  `loc` arrays: CHO-047 and the first request-body story.
- Using `@roadmaps/api-types` in `apps/public-site` (and routing `packages/api-types/*`
  to `site=true` in `classify-changes.sh`): the later story that moves the public site to
  the API read.
