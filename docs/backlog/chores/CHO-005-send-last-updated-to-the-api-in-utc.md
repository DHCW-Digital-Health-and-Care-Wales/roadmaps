# CHO-005: The database API receives a roadmap's Last updated in UTC

- **Status**: Placeholder — promoted when the PostgreSQL-backed HTTP API replaces
  Google Sheets (ADR-002) and its contract for `Last updated` is known
- **Type**: Chore
- **Area**: Infrastructure
- **Epic**: standalone
- **Depends on**: STY-036 (hard)
- **Binding ADRs**: ADR-002
- **Suggested model**: Sonnet — a bounded change at one adapter boundary once the API
  contract exists

## Summary

STY-036 sets "today", for the "Today" button, the "Mark as updated today" tick box
and the no-future-dates limit, from the browser's own clock, and writes a calendar date
(`YYYY-MM-DD`) to the spreadsheet (STY-036 D11). The owner expects the future database
API to take this value in UTC. When that API replaces Sheets, the date the editor sends
must be converted to UTC at that point. STY-036 leaves a code comment naming this chore
where "today" is worked out, so the place is found without a search.

## Why this is a placeholder

The API does not exist yet, so neither does its contract: whether it takes a date or a
timestamp, and how a browser-local "today" maps onto UTC near midnight. The owner asked
for the task to be recorded now (2026-11-13, after review of the EPC-008 PR) against
the switch to the database.

## Rough shape of the work

_Not acceptance criteria._

- Find the comment STY-036 leaves (`rg -n "CHO-005" src`) and the repository adapter
  that writes `Last updated` to the API.
- Send the value as the API contract wants it, in UTC, converting from the browser's
  local "today" at the infrastructure boundary, so `domain/` and `features/` don't
  change (ADR-002).
- Remove the comment once the conversion is in place.
