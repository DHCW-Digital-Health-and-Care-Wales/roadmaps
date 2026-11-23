# STY-089: One copy of the spreadsheet fixtures, read by both apps

- **Status**: Done
- **Type**: Refactor
- **Area**: Infrastructure + CI/CD
- **Epic**: [EPC-022-monorepo-and-backend-foundation](../../EPC-022-monorepo-and-backend-foundation/README.md)
- **Depends on**: STY-088 (hard), STY-098 (hard: the alignment sequence comes first, D1)
- **Binding ADRs**: ADR-016 §The public site, §STY-089 amendments
- **Suggested model**: Sonnet — moving fixtures and repointing tests and docs

## Summary

The editor copies the public site's fake-data spreadsheet CSVs today. One copy, in a
folder at the workspace's root, replaces both and is read by the editor's tests and its
E2E Sheets fake and by the public site's parser tests, so a change to the format fails
both apps in the same pull request. One README there explains the example spreadsheet
and how to try either app against it. Nobody outside the team sees a change. Deliberately not
in it: one CSV parser for both apps, which the Sheets format's retirement removes
instead (D11).

## Scope

The example data and its README move; code does not. The editor's Sheets fake (its CSV
reader and its `batchUpdate` fake, with their tests) stays where it is (D4, D12), and
each app keeps its own CSV parser (D11). Tests change only the path they read from.

## Acceptance criteria

### S1: Both apps read one copy

**Given** the example spreadsheet's `Roadmaps`, `ProductA`, `ProductB`, `ProductC` and
`Template` CSVs in one folder, `fixtures/sheets/` at the workspace's root (D2, D3)
**When** the editor's unit tests, the editor's E2E Sheets fake and the public site's
parser tests run
**Then** each reads the CSVs from that folder, by a relative path (D13)
**And** no other copy of the CSVs is left in either app, and the public site's E2E
data still matches them, as its parser test checks today

### S2: A format change fails both apps in one pull request

**Given** a pull request that changes a CSV in `fixtures/sheets/`
**When** CI classifies its changed paths
**Then** both apps' jobs run, held by a row for the shared sheets in
`classify-changes.test.ts`'s table of paths that run every app's jobs, which replaces
its site-only row for the site's old sheets (D14)
**And** renaming a column in the shared `Roadmaps.csv` fails both `editor:test` and
`site:test`, shown by a throwaway run reported in the PR and reverted, not committed
(D15)

### S3: One README explains the example spreadsheet

**Given** someone who wants to try either app against a test spreadsheet
**When** they open `fixtures/sheets/README.md`
**Then** it lists each file with its tab name and what it shows, says that no data
from the live spreadsheet is ever committed, gives the import steps (`Template`
included), and says how to point the public site and the editor at the result (D6)
**And** the folder holds no licence of its own, since the root `LICENSE` covers the
data, and the provenance note naming `product-roadmaps`' commit goes (D5)

### S4: Every link follows the move

**Given** the docs and guides that name a moved file or folder
**When** the Markdown link check runs
**Then** it passes, and each live mention names `fixtures/sheets/`: ADR-009 and
ADR-011 are corrected in their path alone, with no decision changed (D8)
**And** the one archived record that links into the folder, EPC-002's README, changes
only that link's target (D7), and the mentions of the editor's Sheets fake keep
its unchanged path (D12)

### S5: The deploy repository's README links to the new folder

**Given** `product-roadmaps`' README, which links sheet editors to the public site's old
example sheets
**When** this story's pull request merges
**Then** a companion pull request there, raised with this one and merged right after
it, links to `fixtures/sheets/` (D16)

## Decisions

- **D1** (owner, 2026-11-23, STY-095 grilling round 1): the two apps' alignment comes
  first on the repository track, so this story follows STY-098, the last of the
  alignment sequence (STY-095 D2).
- **D2** (owner, 2026-11-23, STY-089 grilling round 2): the shared copy lives in a plain
  root folder, `fixtures/sheets/`, over a `packages/sheet-fixtures/` workspace package
  or the public site's `sheets/` folder with a classifier rule: data, not code, so no
  package (ADR-016 _The public site_). Gives S1.
- **D3** (owner, round 1): the editor's own `Template.csv` moves into the shared folder
  too, so it holds the whole example spreadsheet as the live one is laid out; the public
  site never reads that tab. Gives S1.
- **D4** (owner, round 1, settled by D12): the editor's test helpers stay in the editor;
  only the data moves.
- **D5** (owner, round 1): the folder's copied `LICENSE` is dropped, since the root
  `LICENSE` holds the same MIT text and the data now originates here, with the
  provenance note. Gives S3.
- **D6** (owner, round 1): one README in the shared folder, with both apps' "try it"
  steps, over a format-only README with each app keeping its own steps. Gives S3.
- **D7** (owner, round 1): the archived EPC-002 README's link changes only its target,
  an exception to records under `_archive/` never being rewritten, over a stub README at
  the old path or exempting the archive from the link check. Gives S4.
- **D8** (owner, round 1): every live mention of a moved path is updated, ADR-009 and
  ADR-011 included, as a path-only correction. Gives S4.
- **D9** (owner, round 1): the public site's `e2e/fixtures/roadmaps.json` stays rebuilt
  by hand when the CSVs change; its parser test already fails the site when they
  differ. No regeneration script.
- **D10** (owner, round 2): when to add a shared package is recorded, as
  ADR-016 _STY-089 amendments_, in the pull request that wrote these criteria.
- **D11** (owner, round 2): the editor's test-only CSV reader and the public site's
  production CSV parser, the same RFC 4180 loop, both stay: both retire with the Sheets
  format (ADR-015), and sharing them needs a code package or a cross-app import.
- **D12** (owner, round 3): the editor's Sheets fake keeps its path,
  `apps/editor/tests/fixtures/sheets/`, over renaming it to `tests/sheets-fake/`.
- **D13** (owner, round 3): both apps reach the folder by relative paths, over an alias
  in each app's Vite and TypeScript config.
- **D14** (owner, round 3): the classifier test gains a row for the shared sheets among
  the paths that run every app's jobs, and its site-only row for the old path goes; the
  script is unchanged, since its catch-all already runs both. Gives S2.
- **D15** (owner, round 4): the delivery shows S2's failure with a throwaway run,
  reported in the PR and not committed. Gives S2.
- **D16** (owner, round 3): `product-roadmaps`' README is fixed by a one-line companion
  pull request there, over a backlog chore or a stub README at the old path. Gives S5.

## Starting point

Audited at `63ff97a4`:

- The four CSVs both apps hold are byte-identical; the editor's fixture README
  (`apps/editor/tests/fixtures/sheets/README.md`) cites `product-roadmaps` commit
  `50e67f9` as their source.
- The editor's Vitest tests import the CSVs with `?raw`, its Playwright Sheets fake reads
  them from disk, and the public site's parser test reads them through
  `new URL(…, import.meta.url)`; that test also compares the site's
  `e2e/fixtures/roadmaps.json` with what the CSVs parse to.
- `scripts/ci/classify-changes.sh` runs both apps' jobs for any path outside `apps/` and
  `docs/` that is not Markdown.
- `product-roadmaps`' README links to `roadmaps/tree/main/apps/public-site/sheets`.
- `rg -n '\]\([^)]*fixtures/sheets' docs/backlog/_archive docs/analysis/delivery-runs`
  finds only the EPC-002 README.

## Out of scope

- A script that rebuilds the public site's E2E data from the CSVs (D9).
- One CSV parser for both apps (D11), and a package for the spreadsheet format: ADR-016
  rejects it, since ADR-015 retires the format when the public site reads the API.

## Delivery

### Departures

- **S3**: the editor's fixture README, moved to `fixtures/sheets/README.md`, loses its
  paragraphs on the Sheets fake's `apply-batch-update.ts` and `parse-csv.ts`, which
  stay in `apps/editor/tests/fixtures/sheets/` (D12) and whose docblocks already say
  what they do; the README names them where it says who reads the CSVs (agent).
- **S4**: lines that record what an audit or an analysis read at a past commit keep
  that commit's paths: EPC-022's _Findings_ (audited at `5d8c58d`) and the analyses'
  _Source_ lines, which name `product-roadmaps`' own `sheets/` (agent).

### Contract for dependents

- The example spreadsheet is `fixtures/sheets/` at the workspace's root, one CSV per
  tab. A format change edits it there, and both apps' tests fail in the same pull
  request; the site's `e2e/fixtures/roadmaps.json` is rebuilt by hand (D9), its parser
  test failing until it matches.
- The editor's Sheets fake stays in `apps/editor/tests/fixtures/sheets/` (D12); each
  app keeps its own CSV parser until the Sheets format retires (D11).

### Scenario evidence

| Scenario | Held by                                                                                                                                                                                                                                                                                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | observed: `git ls-files '*.csv'` lists only the five files in `fixtures/sheets/`; the editor's unit tests (3,070) and E2E suite (450), which read them by `?raw` imports and from disk, and the site's tests (320), whose `parse-roadmap.test.ts` (`matches the end-to-end test data in e2e/fixtures`) reads them through `new URL(…)`, pass against them                                         |
| S2       | `scripts/ci/classify-changes.test.ts` (`runs every app's jobs for the shared example sheets`); observed, a throwaway run not committed: with `Sheet` renamed `Tab` in `fixtures/sheets/Roadmaps.csv`, `pnpm editor:test` failed 141 tests in 2 files (`google-sheets-roadmap-repository.test.ts`, `roadmap-index-parser.test.ts`) and `pnpm site:test` 25 in `parse-roadmap.test.ts`, both exit 1 |
| S3       | `fixtures/sheets/README.md` in the diff; the folder holds no `LICENSE`                                                                                                                                                                                                                                                                                                                            |
| S4       | `build/markdown-links.test.ts` (in `pnpm test:docs`) passes; the diff corrects ADR-009 and ADR-011 in their path alone and EPC-002's archived README in its link's target                                                                                                                                                                                                                         |
| S5       | the companion pull request in `product-roadmaps`, linked from this story's pull request                                                                                                                                                                                                                                                                                                           |
