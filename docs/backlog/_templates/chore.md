# Chore template

- **File**: `docs/backlog/chores/C{nn}-{kebab-title}.md`; terminal statuses
  (Done, Won't do, Superseded) move to `docs/backlog/_archive/chores/`.
- The common rules of `story.md` apply.
- **A chore is work with no user-facing change**: a refactor, a dependency or
  tooling change, a CI fix, or a finding a delivery declined to fix where the
  owner may pay the cost later (Status `Proposed`).
- **A chore measures before it proposes.** The Summary gives the measurement
  at a named commit, so the agent that picks it up can tell which parts are
  still worth doing. Where measuring is the chore, say so and give the search
  and how to judge a hit instead of inventing numbers.

---

# C{nn}: <the state the chore leaves behind>

- **Status**: Proposed — <one line>
- **Type**: Chore | Refactor | Docs (`+` to combine)
- **Area**: Domain | Infrastructure | Features/UI | Routing | i18n (en + cy) |
  E2E | CI/CD | Docs (`+` to combine)
- **Epic**: <epic directory name> | standalone
- **Depends on**: none
- **Binding ADRs**: none
- **Suggested model**: Opus | Sonnet | Haiku — <the reason>
- **Delivered**: _(add on delivery)_

## Summary

_Three to eight lines for the owner: the problem, its measured cost, and what
done looks like._

## Measurement

_At commit `<sha>`. A table where there is more than one area:_

| Area | Measurement | Verdict |
| ---- | ----------- | ------- |

_Where the chore adds a lint rule or a test, say what it would have caught and
how often it recurs; a guard for a one-off needs no rule._

## Acceptance criteria

_A configuration value with no behaviour of its own gets no "the value is
held" scenario; its evidence is an observed run in Delivery._

### S1: <what it proves>

## Decisions

## Out of scope _(optional)_

## Delivery _(add on delivery; as in `story.md`)_

---

## Won't do: the closing entry

```md
- **Status**: Won't do — owner, 2026-11-10 (D1); archived
- **D1** (owner, 2026-11-10, <source>): Won't do. <Why.> Reopen if
  <trigger>.
```
