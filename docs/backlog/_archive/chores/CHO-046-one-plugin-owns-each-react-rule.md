# CHO-046: One plugin owns each React rule

- **Status**: Done
- **Type**: Chore
- **Area**: CI/CD
- **Epic**: standalone
- **Depends on**: CHO-045 (hard)
- **Binding ADRs**: ADR-016
- **Suggested model**: Sonnet — one config block in `eslint.base.ts`, then each new
  finding fixed or disabled as CHO-045 did
- **Delivered**: _(add on delivery)_

## Summary

The root `eslint.base.ts` (STY-095) runs react-hooks `recommended-latest` and
`@eslint-react`'s `recommended-type-checked` together. Nine of their rules check the
same thing, so one finding can need two rule names in its disable; STY-095's
`details-field` disable did, until CHO-045 removed it. The two can also judge the same
code differently. On CHO-045's two measuring hooks, react-hooks' `set-state-in-effect`
(an error) passed, while `@eslint-react`'s failed: a warning, which `--max-warnings=0`
makes fatal. Done: one plugin owns each overlapping rule, and ADR-016 says which.

## Measurement

At commit `bb9c96a5` (`eslint --print-config` on an editor module), both plugins
enable nine of the same rules: `error-boundaries`, `exhaustive-deps`, `purity`,
`rules-of-hooks`, `set-state-in-effect`, `set-state-in-render`, `static-components`,
`unsupported-syntax` and `use-memo`. Each choice was linted over the editor's `src/`:

| Choice                                                                                       | New findings | Note                                                                                                                                                              |
| -------------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| react-hooks owns: `@eslint-react`'s nine off                                                 | 0            |                                                                                                                                                                   |
| `@eslint-react` owns, with its conflict config and its own `globals`, `immutability`, `refs` | 7            | 6 `immutability` and 1 `refs`, each a false positive, such as a ref passed to a click handler or a closure that focuses an input; react-hooks' versions pass them |
| `@eslint-react` owns, react-hooks keeping `globals`, `immutability`, `refs`                  | 0            | No `@eslint-react` preset enables those three                                                                                                                     |

## Acceptance criteria

### S1: No rule is checked twice

**Given** the workspace's ESLint base
**When** any React file is linted
**Then** each concern in the overlap above is reported by one plugin, the one ADR-016
names

## Decisions

- **D1** (owner, 2026-11-23, grilling round 2): react-hooks owns the rules both run,
  over `@eslint-react` or both. These are the React team's own rules, at error severity,
  and their copies in `@eslint-react` flagged code React documents as valid. Delivered
  in CHO-045's PR (grilling round 3).

## Out of scope

- The disables CHO-045 fixed or kept.

## Delivery

### Departures

- **S1**: the base derives the rules it turns off: each rule react-hooks'
  `recommended-latest` enables that `@eslint-react`'s preset also has
  (`ownedByReactHooks`). A rule either plugin adds to the overlap later is turned off
  with no change to the base (agent).

### Contract for dependents

A new React rule is taken from `@eslint-react` only where react-hooks has none;
ADR-016's _CHO-045 and CHO-046 amendments_ say so.

### Scenario evidence

| Scenario | Held by                                                                                                                                                                          |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1       | `eslint --print-config` on an editor module shows `@eslint-react`'s nine overlapping rules off and react-hooks' 17 rules on; `pnpm lint` passes in both apps with no new disable |
