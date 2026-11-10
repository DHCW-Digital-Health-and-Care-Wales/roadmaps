---
name: quality-review
description: Review a diff, branch or PR for code quality, not correctness — layering, naming, readability, duplication, maintainability and conformance to this repository's AGENTS.md guides and ADRs. Use for a "quality review", "clean code review" or "maintainability review", and before raising a PR in the lanes implement-story's delegation reference sets. Not for bugs — that is /code-review.
user-invocable: true
---

# Quality Review

Judge how the change is **built**, not whether it **works**: will the next
person understand it, extend it safely and find it where they expect?

Invoke as `/quality-review [target] [--comment]`.

| Target     | Meaning                                                         |
| ---------- | --------------------------------------------------------------- |
| _(none)_   | Current branch against `origin/main` (committed + working tree) |
| `<number>` | That pull request, scoped from git as in `code-review`          |
| `<branch>` | That branch against `origin/main`                               |
| `<path>`   | Those files or directories as they stand                        |

For a PR number or `--comment`, read
`.claude/skills/code-review/references/pr-target.md`. Without `--comment`,
report in the conversation only.

## Out of scope

- **Bugs, races, security holes.** List one noticed in passing under "Handed
  off"; never let it displace a quality finding.
- **Anything a tool enforces.** ESLint (strict type-checked rules, React Hooks,
  `jsx-a11y`, the per-layer `no-restricted-imports` blocks, the `google` global
  restriction and `i18next/no-literal-string` in `eslint.config.ts`), Prettier
  (`pnpm format:check`), TypeScript strict (including `cy.ts` parity with
  `en.ts`) and `actionlint`. Flag only what the tool cannot see: copy built in
  `.ts` files, a layer leak through a re-export, an `eslint-disable` with no
  reason.
- **Taste with no cost.** If you cannot say what it makes easier, cheaper or
  safer for the next reader, drop it.

## Working order

1. **Diff and rules.** Pin the scope as `code-review`'s _Pin the scope_ step
   does, on the same snapshot. Read the root `AGENTS.md` and the `AGENTS.md`
   along each changed path's directory ancestry (`tests/e2e/AGENTS.md`,
   `docs/AGENTS.md`), plus the binding ADRs; cite the rule by file and line,
   never from memory. A docs-only diff is reviewed against `docs/AGENTS.md`
   (the records guide). Repo rules outrank generic advice.
2. **Context.** Open the story, defect or chore (`docs/backlog/`) the change
   implements and each touched file beyond the hunk, and see how neighbours do
   the same thing before calling anything inconsistent.
3. **Look for** what a linter cannot:
   - **Wrong layer.** Business decisions (what an expired session keeps on
     screen, which kinds are retryable, how a roadmap is derived from a
     worksheet) in a component or in the wrong adapter; Sheets or Google terms
     (`sheetId`, worksheet, range, status codes) in `features/`, `components/`
     or a `Roadmap` field; HTTP outside `infrastructure/`; a route module doing
     a feature page's job; a feature reaching `app/`; a shared building block
     in a feature that `components/` or `lib/` should own (or the reverse).
   - **Wrong-direction dependency.** A dynamic import, a lazy `require` or a
     context hop to dodge a cycle: fix the direction, do not just hoist it.
   - **Names that understate.** A flag whose name covers less than its effect;
     `use*` or `get*` that also writes, subscribes or navigates; a generic
     `handle`, `data` or `update` hiding a side effect; a hook returning
     `{ data }` of a different shape than TanStack's. Fix: rename, or split the
     method.
   - **Scattered safety.** An invariant hand-placed at many call sites or
     written nowhere: a query key built outside `roadmapKeys` or not under
     `authScopedQueryKey`, an `enabled: connected` check copied per hook, an
     `unauthenticated` check in each component rather than the one
     `QueryCache.onError`, a token read outside `getAccessToken`. Fix: enforce
     it in one entry point, else document it in the owning module or an ADR.
   - **Repeated work.** The same fetch, parse or derivation twice on one path;
     an effect that recomputes what `select` or `useMemo` should; two queries
     for one answer.
   - **Clumsy shape.** A boolean prop that makes a component do two jobs; a
     component with a growing `variant` ladder where composition would do; one
     construction written out at every call site; props drilled through layers
     a context or the router already reaches.
   - **Reimplementation.** A new helper where one exists (`cn`, `AppError`
     helpers, `createExternalStore`, `StatusPanel`, `ReconnectButton`,
     `renderWithProviders`, the in-memory repository, the fakes); same concept
     named differently across layers (`remove`/`delete`/`clear`,
     `roadmap`/`sheet`/`board`).
   - **Dead or false text.** No-op assignments, unused parameters, exports or
     branches, suppressions with no reason, comments that went stale,
     including "left for S0n" or "TODO" after the story closed. Beyond the
     diff: README, ADRs, `AGENTS.md` guides, the Handoff log, workflows,
     scripts and config that a changed command, key, route or default now
     makes false; grep for the old form.
   - **Inconsistent failure.** A helper returning `null` where its sibling
     throws; a broad `catch` that swallows or turns an abort into an error; an
     `AppError` kind chosen differently for the same cause in two adapters;
     error text rendered from `message` where a `kind` key exists.
   - **Tests.** Names that state the function rather than the behaviour,
     copied setup that `renderWithProviders` or a fake already gives, mocks of
     the unit under test or of what MSW and the fakes cover, assertions on
     implementation (class names, call counts) rather than role and name,
     sleeps where fake timers or the clock fit, an adapter without the shared
     repository contract.
   - **Meta code.** A test or check that would fail on a semantically
     identical rewrite of what it checks (a snapshot of markup, a reordered
     workflow `needs`, a renamed job); an exception list over about 10 entries;
     a new gate with no motivating incident, review date or severity that
     warrants it. Fix: assert the invariant, pay the list off at its source or
     move exceptions inline, record the reason and date.
   - **Rulebook growth.** A line added to an `AGENTS.md`, `SKILL.md` or agent
     file must pass `docs/operations/authoring-agent-instructions.md`'s test
     and recur bar (and the `writing-for-agents` skill), and replace or sharpen
     an existing line, or its commit or PR body says why the file grows. Flag
     an incident narrative or story id used as the reason for a rule; the
     Handoff log is where per-delivery history belongs.
   - **Change shape.** Scope the story does not reflect (name it so the story
     is updated); a mechanical rename mixed into logic; unrelated refactors;
     generated files (`routeTree.gen.ts`, lockfile) changed without their
     cause; a deviation from an ADR that does not update or supersede it.
   - **Layout.** A file in the wrong place or grown past a natural split (one
     concept per module, kebab-case names, named exports, tests beside the
     code); new keys appended to a catalogue out of its feature grouping, or
     present in `cy.ts` in a different order from `en.ts`; new fields prepended
     rather than placed beside related ones.
   - **Design-system drift.** Component, slot, spacing, typography and
     recipe choices, in class helpers and variant strings as well as JSX,
     checked against `src/components/ui/` (stay close to upstream shadcn on
     Base UI; added with the shadcn CLI, never a hand-rolled competing
     primitive, never Radix), ADR-0005 and root `AGENTS.md`: theme tokens
     (`--brand` used sparingly) over raw colours, `cn(buttonVariants())` for
     links styled as buttons, existing layout pieces (`AppShell`, `StatusPanel`,
     `RoadmapIcon`) over near-copies, sentence-case copy. Verify a suggested
     token, variant or hook exists before recommending it; demand no
     speculative alias or hook.
   - **Left in a touched file.** A violation the change's touched files
     already carry within reach of its edit: leave each touched file tidier,
     proportionally. Name the violation and the line, and do not demand a wider
     refactor.
4. **Filter.** Keep a finding only with file and line, the cost of leaving it
   and a concrete fix. Merge duplicates into one listing every site.
5. **Report**; with `--comment`, post.

## Grading

| Grade         | Meaning                                                           |
| ------------- | ----------------------------------------------------------------- |
| 🔴 **Fix**    | Breaks a written rule, or will predictably derail the next change |
| 🟡 **Should** | Real maintenance cost (misleading, duplicated, hard to read)      |
| 💭 **Nit**    | Small and local; fix when the file is next touched                |

A finding citing an `AGENTS.md` or ADR rule is 🔴 unless the rule allows the
exception. Grade it 🟡 when the cited line itself fails the authoring guide's
bar, and say so.
Never grade up to look thorough: three accurate findings beat twelve padded ones.

## Report format

```
## Quality review — <target>

**Verdict:** <one or two sentences: overall shape, and whether anything must change before merge>

**Read:** <the requirement record, area guides and neighbouring files opened beyond the diff, or what was unavailable>

### What's done well
- <specific patterns worth repeating>

### Findings
1. 🔴 **<short title>** — `path/to/file.tsx:123`
   <what is wrong, and the cost of leaving it>
   **Fix:** <the concrete change>

### Handed off
- <correctness concern for /code-review, or "None">
```

A handed-off concern is not a correctness review or a resolved finding; keep
`code-review`'s findings out of this verdict.

Order 🔴 → 🟡 → 💭. When re-reviewing, open with a table of earlier findings and
status (✅ fixed / ⚠️ partly / ❌ open) before any new ones.

The implementer acts on findings as
`.claude/skills/implement-story/references/pull-requests.md` sets.
