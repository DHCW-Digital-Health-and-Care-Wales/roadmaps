# CHO-049: Every route's wait on the database has a deadline

- **Status**: Placeholder — left by STY-101's grilling (2026-11-24); promoted by the
  first route that queries, or by EPC-023's choice of hosted database
- **Type**: Chore
- **Area**: API
- **Epic**: [EPC-024-tenancy-sign-in-and-optional-api-mode](../EPC-024-tenancy-sign-in-and-optional-api-mode/README.md)
- **Depends on**: none
- **Binding ADRs**: ADR-017 §Operation
- **Suggested model**: Sonnet — engine settings and one test of a silent network

## Summary

`/ready` answers at two seconds whatever the database does, by running its check in a
thread of its own. No other route has that: a query on a pooled connection whose server
goes silent waits with no limit, since the connect, pool and statement timeouts do not
cover a connection already open, and each waiting request holds one of the server's
worker threads. Done: the engine's connections give up on a silent server within a
stated time, for every route, and `/ready` keeps or loses its thread by what that
leaves uncovered.

## Why this is a placeholder

No route but `/ready` queries, so nothing waits today (audited at `17bcb6e8`), and the
time to give up after, the answer a caller gets and what the hosted database's connector
passes through are undecided. The owner asked only that the timeout be recorded
(STY-101 D14).

## Rough shape of the work

_Not acceptance criteria._

- psycopg 3.3.9's synchronous `execute` takes no client-side deadline. libpq's
  `tcp_user_timeout` and keepalive settings end a connection whose peer stops
  acknowledging (a dropped network path), for every route.
- They do not end one whose server's kernel still acknowledges while its process is
  frozen. STY-090's freezing proxy imitates that case, which only `/ready`'s thread
  covers, so the proxy cannot test the network case: that needs a peer that stops
  acknowledging.
- ADR-017 _Operation_ would then state each wait a query can meet and what bounds it,
  naming any that nothing bounds, with `/ready`'s thread kept only if it covers one.

## Decisions

- **D1** (owner, 2026-11-24, STY-101 grilling round 1, STY-101 D14): `/ready` keeps its
  thread for now and the pattern is copied nowhere; the general timeout is this chore.

## Out of scope

- The hosted database's own connector and its timeouts (EPC-023).
