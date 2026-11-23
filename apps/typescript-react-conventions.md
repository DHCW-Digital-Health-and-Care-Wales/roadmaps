# TypeScript and React conventions

The conventions the editor and the public site share (ADR-016), beside each app's own
`AGENTS.md`.

- TypeScript strict: no `any`; a non-null assertion carries a comment justifying it.
- Named exports, kebab-case file names, one concept per module, function components.
- Tests sit beside the code as `*.test.ts(x)`; a table-driven test is an `it.each`.
- Put a `{" "}` text node before a `sr-only` span that continues a visible name: name
  computation drops a leading space inside the span ("Edit Minimal card").

## Where the apps differ on purpose

- **Routing**: the public site keeps its own small router (`apps/public-site/src/lib/router.ts`),
  not the editor's TanStack Router. The site is a static, prerendered site served per
  path; the editor's router runs on hash history with no server rendering (ADR-004),
  which cannot serve a page per path, and its size would weigh on the site's 100 KB
  script budget (ADR-016, _STY-095 amendments_). Do not align the two.
