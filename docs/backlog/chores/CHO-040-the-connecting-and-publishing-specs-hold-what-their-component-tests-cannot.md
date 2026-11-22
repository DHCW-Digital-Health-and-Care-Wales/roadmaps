# CHO-040: The connecting and publishing specs hold only what their component tests cannot

- **Status**: Proposed — part of CHO-014 (its D9); the smallest saving, and connecting changes shape at the switch (ADR-018)
- **Type**: Refactor
- **Area**: E2E + Features/UI (tests only)
- **Epic**: standalone
- **Parent**: CHO-014
- **Depends on**: none
- **Binding ADRs**: ADR-003, ADR-006, ADR-018
- **Suggested model**: Sonnet — each test is weighed against the component test that
  may hold it, and the gesture and token checks kept
- **Delivered**: _(add on delivery)_

## Summary

The specs for connecting, the session and publishing take 33 s of the E2E suite's
1,215 s summed. Only a browser sees Google's popup open inside a real click and the next
request carry a renewed token, and those tests stay; most of the rest assert notices
and dialogs that component and page tests already assert. Cutting them saves about 26 s
and 430 lines. Sign-in moves to the API at the switch (ADR-018), so these cuts matter
less the sooner it comes. Done looks like: these specs hold the gesture, the tokens and
one publish through the fakes.

## Measurement

At `9ee767b`, five specs (`auth`, `reconnect`, `session-warning`, `publishing-roadmap`,
`sheets-writes`): 32 tests, one run each. Candidates:

| Candidates                                                        | CI s | Held by                                                                                                                | Verdict                                                                    |
| ----------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `auth.spec.ts:71`, eight of its ten rows of ways connecting fails | ~7   | `auth-notice.test.tsx:30`, `:65`, `:135`; `google-auth-client.test.ts:247`, `:260`, `:299`, `:403`; `app.test.tsx:348` | Keep the blocked popup from the start page and access denied from the menu |
| `auth.spec.ts:102`, `:128`, `:159`                                | ~3   | `auth-notice.test.tsx:76`, `:219`, `:321`, `:396`                                                                      | Cut                                                                        |
| `reconnect.spec.ts:94`, `:131`, `:154`, `:174`                    | ~7   | `reconnect-dialog.test.tsx:155`, `:169`, `:190`, `:265`; `roadmap-detail-page-editing.test.tsx:645`                    | Cut; keep `:59`, the real Reconnect click and write                        |
| `session-warning.spec.ts:38`, `:84`, `:115`                       | ~2   | `session-warning.test.tsx:60`, `:83`, `:193`, `:211`; `google-auth-client.test.ts:607`                                 | Cut; keep `:53`, the renewal in a real click                               |
| `publishing-roadmap.spec.ts:86`, `:110`, `:136`, `:153`, `:186`   | ~7   | `roadmap-detail-page-publishing-roadmap.test.tsx:231`, `:260`, `:288`, `:460`, `:477`, `:524`                          | Cut; keep `:53`, the publish and the list after a reload                   |
| `sheets-writes.spec.ts:57`, `:82`                                 | ~1   | Nothing: they test the Sheets fake                                                                                     | Keep; may merge                                                            |

Not settled: whether `auth.spec.ts:177`, a real script that fails to load, is worth
its second; whether the Sheets adapter's parser tests hold a tab with only its header
and a `Soon` horizon (`publishing-roadmap.spec.ts:153`, `:186`). The Welsh title of the
publish confirmation (`cy.ts`) is asserted only in E2E.

## Acceptance criteria

### S1: These specs hold the gesture, the tokens and one publish

**Given** the five specs above at `9ee767b`
**When** the chore is delivered
**Then** what remains holds Google's popup opened inside a real click, a renewed or
reconnected token on the next request, a token kept out of storage, and one publish
through the fakes shown after a reload

### S2: The cuts meet CHO-014

**Given** any test this chore cuts or trims
**When** its PR is raised
**Then** CHO-014's S4, S5, S7 and S9 hold for it; an assertion held only by
`google-auth-client.test.ts` counts as about Google sign-in alone

## Decisions

- **D1** (owner, 2026-11-22, CHO-014 D9): this chore is one of CHO-014's sub-chores,
  delivered alone.

## Out of scope

- The duplicates among the auth component tests and `google-auth-client.test.ts`:
  CHO-041 takes the component tests; the GIS client's go with it at the switch.
