# STY-093: A deterministic seeder fills a local database with plausible roadmaps

- **Status**: Placeholder — promoted once ADR-017 is accepted and the first schema exists
- **Type**: Feature
- **Area**: Infrastructure
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: STY-091 (hard)
- **Binding ADRs**: ADR-017 §Operation
- **Suggested model**: Sonnet — factories over a known schema

## Summary

A developer runs one command and the local database holds a DHCW tenant, people with
roles, and roadmaps with items in Now, Next and Later, in English and Welsh, the same
every time. It refuses any environment but local and test, and grows with each schema
story.

## Why this is a placeholder

ADR-017 is Proposed, and the seeder needs the first schema.

## Rough shape of the work

_Not acceptance criteria._

- Factories with a fixed Faker seed; Welsh from a hand-written phrase list.
- An environment guard; a root `api:seed` script.
