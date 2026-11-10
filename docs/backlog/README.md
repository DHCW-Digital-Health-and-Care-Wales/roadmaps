# Backlog

The index of the work the project knows about. New records start from
`_templates/`, statuses follow `_templates/status-lifecycle.md`, and delivery
follows `.agents/skills/implement-story/SKILL.md`: one record, one reviewed PR.
`docs/AGENTS.md` has the layout and ID rules. A record in a terminal status
moves to `_archive/`, where its row here still points.

## Epics

| Epic                                      | Summary                                                                                                     | Status |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------ |
| [bootstrap](_archive/bootstrap/README.md) | S01–S09: tooling, domain, Google auth and Sheets, i18n, app shell, roadmaps, E2E, CI/CD, final verification | Done   |

## Chores

_None yet._ Live chores sit in `chores/`; list each here as `C<nn>` with its
Status token.

## Defects

| ID                                                | Defect                                | Status       |
| ------------------------------------------------- | ------------------------------------- | ------------ |
| [D01](defects/D01-roadmaps-heading-title-case.md) | The roadmaps heading is in Title Case | Needs triage |

A defect found during delivery is recorded in `defects/` with
Status `Needs triage` and listed here until the owner triages it.
