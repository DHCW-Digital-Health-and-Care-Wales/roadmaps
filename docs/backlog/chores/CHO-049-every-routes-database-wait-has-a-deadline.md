# CHO-049: Every route's wait on the database has a deadline

- **Status**: Proposed — left by STY-101's grilling (2026-11-24), to weigh with the
  hosted database (EPC-023) or the first route that queries
- **Type**: Chore
- **Area**: API
- **Epic**: [EPC-022-monorepo-and-backend-foundation](../EPC-022-monorepo-and-backend-foundation/README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-017 §Operation
- **Suggested model**: Sonnet — engine settings and a test that reuses STY-090's proxy

## Summary

`/ready` answers at two seconds whatever the database does, by running its check in a
thread of its own. No other route has that: a query on a pooled connection whose server
goes silent waits with no limit, since the connect, pool and statement timeouts do not
cover a connection already open, and each waiting request holds one of the server's
worker threads. Done: the engine's connections give up on a silent server within a
stated time, for every route, and `/ready` keeps or loses its thread by what that
leaves uncovered.

## Measurement

At commit `17bcb6e8`: no route but `/ready` queries, so nothing waits today. psycopg
3.3.9's synchronous `execute` takes no client-side deadline. libpq's `tcp_user_timeout`
and keepalive settings end a connection whose peer stops acknowledging (a dropped
network path); they do not end one whose server's kernel still acknowledges while the
process is frozen, which is what STY-090's freezing proxy imitates and its thread
covers.

## Acceptance criteria

### S1: A silent network ends a query's wait

**Given** a route that queries, and a pooled connection whose peer stops acknowledging
**When** the route runs its query
**Then** the wait ends within the stated time with the coded 500 or 503 the route
gives a database failure, and the connection leaves the pool

### S2: What stays uncovered is written down

**Given** the settings chosen
**When** ADR-017 _Operation_ is read
**Then** it states each wait a query can meet and what bounds it, and names any that
nothing bounds, with `/ready`'s thread kept only if it covers one of them

## Decisions

- **D1** (owner, 2026-11-24, STY-101 grilling round 1, STY-101 D14): `/ready` keeps its
  thread for now and the pattern is copied nowhere; the general timeout is this chore.

## Out of scope

- The hosted database's own connector and its timeouts (EPC-023).
