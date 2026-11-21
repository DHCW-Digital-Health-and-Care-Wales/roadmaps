# STY-093: A deterministic seeder fills a local database, growing with each schema story

- **Status**: Placeholder — promoted once ADR-017 is accepted
- **Type**: Feature
- **Area**: API
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: STY-091 (hard)
- **Binding ADRs**: ADR-017 §Operation
- **Suggested model**: Sonnet — a small harness the schema stories extend

## Summary

A developer runs one command and the local database is filled with the same plausible
fake data every time, in English and Welsh. It starts with the DHCW tenant; each schema
story that follows adds its own factories (people, roles, roadmaps, items), so local
data grows from the start.

## Why this is a placeholder

ADR-017 is Proposed.

## Rough shape of the work

_Not acceptance criteria._

- The command and a root `api:seed` script; a fixed seed; a hand-written Welsh phrase
  list; the DHCW tenant.
- Proposed defaults: factories with Faker; refusing any environment but local and test.
