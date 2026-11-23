# STY-099: The public site takes the DHCW design tokens

- **Status**: Placeholder — recorded in the owner's STY-095 grilling (2026-11-23, D1);
  promoted once design input settles what the public sees
- **Type**: Refactor + Feature
- **Area**: Features/UI
- **Epic**: [EPC-022-monorepo-and-backend-foundation](README.md)
- **Depends on**: STY-098 (hard; after the alignment sequence)
- **Binding ADRs**: ADR-010
- **Suggested model**: Opus — a visible change to the public site, designed first

## Summary

The public site draws its colours from one flat Tailwind theme of its own; the editor
draws them from the DHCW design system's primitives through semantic tokens, checked by
lint. Some values agree, others do not: the site's focus ring is yellow `#f8ca4d` with
navy, the editor's `#ffeb3b`. This story brings the site onto the design system's
tokens, which changes what the public sees.

## Why this is a placeholder

The change is visible to the public, so its acceptance criteria wait for design input:
which values are brand-correct where the apps differ, shown as prototypes and
before/after screenshots for the owner to choose from.

## Rough shape of the work

_Not acceptance criteria._

- The site's theme rebuilt on the design system's primitives and semantic tokens, with
  the editor's token lint, within the site's Lighthouse budgets.
- The focus ring settled for both apps, from the design system.
- **Open question**: whether the header, footer and language toggle become shared
  components. The editor's are shadcn and Base UI; the site's are plain React that work
  without JavaScript after prerender, within a 100 KB script budget. Sharing them needs
  these tokens first and a UI package, and the no-JavaScript and budget constraints may
  rule it out.

## Decisions

- **D1** (owner, 2026-11-23, STY-095 grilling round 5): record the token alignment as a
  placeholder in EPC-022, after the alignment sequence, with the shared header, footer
  and toggle an open question in it rather than a record of its own.
