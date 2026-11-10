# ADR-001: Record architecture decisions

- Status: Accepted
- Date: 2026-11-10

## Context

The project is built incrementally by several agents working sequentially. Decisions must
survive between hand-offs and be discoverable by humans later.

## Decision

Record significant decisions as ADRs in `docs/adr/`. Work items live in `docs/backlog/`.
An agent that changes a decision supersedes the ADR in the same commit.

## Consequences

Small documentation overhead; decisions are explicit and reviewable.
