# CHO-052: Upgrade TypeScript to 7 and remove the Dependabot major-version ignore

- **Status**: Proposed — blocked upstream on `typescript-eslint` supporting TypeScript 7.0
- **Type**: Chore
- **Area**: CI/CD
- **Epic**: standalone
- **Depends on**: none
- **Binding ADRs**: ADR-016
- **Suggested model**: Sonnet — remove the ignore, bump TypeScript, verify workspace lint/typecheck/build
- **Delivered**: _(add on delivery)_

## Summary

Dependabot's monthly `pnpm` group PR (#290) bundled TypeScript `7.0.2` alongside 14 routine
updates, breaking `Repository`, `Editor: verify` and `Public site: verify` because
`typescript-eslint` `8.73.0` rejects TypeScript 7.0. To unblock monthly `pnpm` updates,
`.github/dependabot.yml` ignores `version-update:semver-major` for `typescript`. Because
Dependabot ignores have no expiry, this chore tracks removing that ignore and adopting
TypeScript 7 once a `typescript-eslint` release supports it (and is past the 7-day
`minimumReleaseAge` cooldown).

## Measurement

At commit `3a2e3605` (PR #290 CI run 45554844371):

| Area                  | Measurement                                                                    | Verdict |
| --------------------- | ------------------------------------------------------------------------------ | ------- |
| `Repository`          | `Error: typescript-eslint does not support TS 7.0.`                            | Blocked |
| `Editor: verify`      | ESLint crashes: `TypeError: Cannot read properties of undefined ('Intrinsic')` | Blocked |
| `Public site: verify` | ESLint crashes: `TypeError: Cannot read properties of undefined ('Intrinsic')` | Blocked |

## Acceptance criteria

### S1: TypeScript 7 passes the workspace checks with no Dependabot ignore

**Given** a `typescript-eslint` release supporting TypeScript 7.0 is past the 7-day cooldown
**When** the `typescript` major-version `ignore` is removed from `.github/dependabot.yml` and `typescript` is upgraded to 7.x in `pnpm-workspace.yaml`
**Then** `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build` pass across the workspace

## Decisions

_None yet: awaiting upstream `typescript-eslint` support for TypeScript 7.0._
