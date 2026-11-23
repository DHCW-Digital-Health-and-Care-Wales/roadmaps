# TypeScript and React conventions

The conventions the editor and the public site share (ADR-016), beside each app's own
`AGENTS.md`.

- TypeScript strict: no `any`; a non-null assertion carries a comment justifying it.
- Named exports, kebab-case file names, one concept per module, function components.
- Tests sit beside the code as `*.test.ts(x)`; a table-driven test is an `it.each`.
- Put a `{" "}` text node before a `sr-only` span that continues a visible name: name
  computation drops a leading space inside the span ("Edit Minimal card").
