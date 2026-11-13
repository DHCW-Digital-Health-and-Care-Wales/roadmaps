# EPC-008: Publishing and freshness — whether a roadmap is public, and how current it says it is

- **Status**: Done — grilled in rounds 1–4 (2026-11-13); every story delivered, STY-035
  merged ([#57](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/57)),
  STY-036 in [#58](https://github.com/DHCW-Digital-Health-and-Care-Wales/roadmaps-editor/pull/58), which awaits the owner's merge
- **Progress**: 2 of 2 terminal
- **Binding ADRs**: ADR-012, ADR-009, ADR-002, ADR-008

## Summary

A Product Lead can edit a roadmap's text, family and items, but still opens the
spreadsheet to make a roadmap public, take it down, or date it. This epic adds
both from the roadmap's page. "Publish roadmap" and "Unpublish roadmap" write
`Enabled` straight away after a confirmation. Publishing is refused when the row
would fail the public site's nightly sync. "Last updated" becomes a date in the
About form, and the publish dialog offers "Mark as updated today". It is
unticked by default. Showing which roadmaps are stale (A7) stays out.

## Owner decisions waiting

None.

## Findings

Audited at `220972a` on 2026-11-13.

| Where                       | Published (`Enabled`)                         | `Last updated`                                     |
| --------------------------- | --------------------------------------------- | -------------------------------------------------- |
| Roadmap list card           | "Not published" badge; list count of them     | shown as a date (`roadmap-card.tsx`)               |
| Roadmap page                | "Not published" badge; Publish or Save naming | not shown                                          |
| About form, publish, review | not a field                                   | not a field (`EDITABLE_ROADMAP_FIELDS`)            |
| Repository                  | read only, `published` on `Roadmap`           | read only, `lastUpdated` as `YYYY-MM-DD` or `null` |

### F1 — Both are read-only by decision

ADR-012 _What is editable_ keeps `Last updated` and published read-only, and its
Option 9 says publishing never changes `Last updated`. STY-024 D2 kept `Last updated`
off the roadmap page. The persona's A7 (staleness) needs dates people actually set.

### F2 — One enabled row can fail the public site for everyone

Among enabled rows only, the public site's sync fails on a slug with no letters or
digits, two rows sharing a slug, a `Sheet` that names no tab, a `#rgb` colour, or a
roadmap tab without a `Title` or `Horizon` column (`docs/analysis/roadmaps-tab-format.md`,
_Identity, ordering and failures_). Disabled rows are dropped first, so a disabled row
is never the cause. The parser already records most of these as problems
(`rg -n "missing-tab|duplicate-id|short-colour|invalid-id" src/infrastructure/google-sheets/roadmap-index-parser.ts`).

### F3 — Only an exact `Yes` publishes

`Enabled` publishes only for exactly `Yes`; `No`, blank and anything else do not, and a
value other than `Yes`, `No` or blank is recorded as `enabled-not-yes`. A missing
`Enabled` column lists every roadmap as not published (ADR-009).

## Design

Set in grilling rounds 1–4 (2026-11-13); each story's Decisions cite the answers.

1. Publishing or unpublishing a roadmap is its own action on the roadmap's page, with
   a confirmation, written at once and apart from pending edits (F1). STY-035.
2. Publishing a roadmap is refused, naming the problem, when its row would fail the
   public site's sync once enabled (F2). Unpublishing is never checked, not even for
   the last published roadmap.
3. `Last updated` becomes a pending About field, a date that may be cleared but not
   set after today, published with the rest; the publish dialog can also set it to
   today on request (F1). STY-036.
4. **Unchanged:** ADR-012's per-roadmap, all-or-nothing publish of pending edits, its
   conflict review and Refresh rules; publishing pending edits sets
   `Last updated` only when the Product Lead asks; the list stays read-only.

## Shared assumptions and contracts

### What the editor writes

Each story adds its cells to README _What the editor writes_ in its own PR and says so
in the PR, since the format is a contract with the public site: STY-035 the `Enabled`
cell (exactly `Yes` or `No`), STY-036 the `Last updated` cell (`YYYY-MM-DD` as text, or
empty).

### ADR-012 amendments

Each story amends ADR-012 in place (`### STY-035 amendments`, `### STY-036 amendments`)
in its PR, citing its owner decisions: STY-035 makes published writable outside a
publish of pending edits; STY-036 makes `Last updated` editable and refines Option 9.

### Words

"Publish roadmap" (make it public) sits beside "Publish changes" (write pending
edits). STY-035 settles the copy with the `copywriter` skill in English and Welsh and
updates the glossary's _Publish_, _Save_ and _Published roadmap_ entries.

## Stories

| ID      | Story                                                                                          | Area                                       | Depends on                | State |
| ------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------- | ----- |
| STY-035 | [A Product Lead publishes or unpublishes a roadmap](STY-035-publish-or-unpublish-a-roadmap.md) | Domain + Infra + UI + i18n (en + cy) + E2E | —                         | ✅    |
| STY-036 | [A Product Lead sets when a roadmap was last updated](STY-036-set-last-updated.md)             | Domain + Infra + UI + i18n (en + cy) + E2E | STY-035 (preferred order) | ✅    |

## Sequencing

Either order works. STY-035 goes first: its "Publish roadmap" dialog, with or without
unsaved edits, is one of the places STY-036 offers "Mark as updated today" (STY-036 S6,
D10). If STY-036 lands first, STY-035 adds the tick box to its dialog instead.

## Out of scope

- **Staleness (A7)**: marking roadmaps not updated for six weeks. A later record,
  once dates are being set.
- **Swapping a draft for the live roadmap** (a second row sharing its slug): refused
  for now (STY-035 D4); a later draft feature.
- **Publishing or unpublishing from the list**: the list keeps its badge only
  (STY-035 D5).

## Defects

None.

## Related

- `docs/analysis/roadmaps-tab-format.md`: the `Enabled` and `Last updated` columns and
  what fails the public site's sync.
- ADR-009 (which rows are listed), ADR-012 (publishing pending edits).
- Persona: `docs/backlog/personas/product-lead.md` (A7, A9).
