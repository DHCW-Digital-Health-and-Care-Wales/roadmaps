# Backlog

The index of the work the project knows about. New records start from
`_templates/`, statuses follow `_templates/status-lifecycle.md`, and delivery
follows `.agents/skills/implement-story/SKILL.md`: one record, one reviewed PR.
`docs/AGENTS.md` has the layout and ID rules. A record in a terminal status
moves to `_archive/`, where its row here still points.

## Personas

- [Product Lead](personas/product-lead.md): manages the public Now / Next / Later roadmaps
  of the products they lead; the primary user. Owner answers recorded 2026-11-10.

## Epics

| Epic                                                                                                     | Summary                                                                                                                                                                        | Status |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| [EPC-001 Bootstrap](_archive/EPC-001-bootstrap/README.md)                                                | STY-001–STY-009: tooling, domain, Google auth and Sheets, i18n, app shell, roadmaps, E2E, CI/CD, final verification                                                            | Done   |
| [EPC-002 Roadmap list from the roadmap index](_archive/EPC-002-roadmap-list-from-roadmaps-tab/README.md) | STY-010–STY-012: list the roadmaps the public site lists, with their information, grouped by family                                                                            | Done   |
| [EPC-003 DHCW design alignment](_archive/EPC-003-dhcw-design-alignment/README.md)                        | STY-013–STY-018: DHCW tokens, type and focus; lint-enforced tokens; DHCW components, shell and logo; on-screen failures and a session warning; look checks without screenshots | Done   |
| [EPC-004 Roadmap items](EPC-004-roadmap-items/README.md)                                                 | STY-019–STY-021: model a roadmap item from every column, read a roadmap's items by header, and show them on its page under the six placements                                  | Active |

## Chores

_None yet._ Live chores sit in `chores/`; list each here as `CHO-<nnn>` with its
Status token.

## Defects

| ID                                                                 | Defect                                | Status |
| ------------------------------------------------------------------ | ------------------------------------- | ------ |
| [DEF-001](_archive/defects/DEF-001-roadmaps-heading-title-case.md) | The roadmaps heading is in Title Case | Done   |

A defect found during delivery is recorded in `defects/` with
Status `Needs triage` and listed here until the owner triages it.
