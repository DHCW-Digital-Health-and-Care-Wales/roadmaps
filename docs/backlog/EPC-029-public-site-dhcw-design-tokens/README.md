# EPC-029: Public site DHCW design tokens — aligning the public site with the design system

- **Status**: Needs grilling — split out of EPC-022 when EPC-022 closed (owner,
  2026-11-25); waits for design input on what the public sees
- **Progress**: 0 of 1 terminal; next selectable: none — STY-099 is a Placeholder awaiting
  design input
- **Binding ADRs**: ADR-010, ADR-016

## Summary

[EPC-022](../_archive/EPC-022-monorepo-and-backend-foundation/README.md) brought the
public site (`apps/public-site`) into the monorepo and aligned its code conventions,
typed catalogues, dependencies and font with the editor. One visual task remained as a
placeholder: moving the public site from its own flat Tailwind theme onto the DHCW design
system's primitive and semantic tokens (ADR-010), which changes what the public sees. This
one-story epic holds [STY-099](STY-099-the-public-site-takes-the-dhcw-design-tokens.md)
independently of the backend API epics.

## Owner decisions waiting

- [STY-099](STY-099-the-public-site-takes-the-dhcw-design-tokens.md) — brand-correct
  design token values where the public site and editor differ (e.g. focus ring), and
  whether the header, footer and language toggle become shared components

## Findings

Carried from EPC-022 (STY-095 grilling, 2026-11-23):

- The public site draws colours from its own flat theme in `apps/public-site/src/index.css`
  rather than semantic DHCW tokens checked by lint.
- The public site works without JavaScript after prerender and has about 1.5 KB to spare
  against its 100 KB script budget (`apps/public-site/lighthouserc.json`), so any shared
  UI package or dependency change must run `pnpm site:lighthouse`.

## Design

1. Prototype and settle brand-correct token values with before/after screenshots for the
   owner before changing what the public sees (`STY-099`).
2. **Unchanged:** the public site stays functional without JavaScript after prerender and
   within its Lighthouse budgets.

## Shared assumptions and contracts

See [delivery-notes.md](delivery-notes.md) for the public-site owner-screenshot gate and
Lighthouse script budget carried from EPC-022.

## Stories

| ID      | Story                                                                                            | Area        | Depends on | State |
| ------- | ------------------------------------------------------------------------------------------------ | ----------- | ---------- | ----- |
| STY-099 | [The site takes the DHCW design tokens](STY-099-the-public-site-takes-the-dhcw-design-tokens.md) | Features/UI | STY-098    |       |

## Sequencing

Independent of EPC-023–EPC-028; its prerequisite (`STY-098`) is already Done. Ready to
grill whenever design input is available.

## Out of scope

- Backend API integration for the public site:
  [EPC-028](../EPC-028-public-read-api-sheets-migration-entra-and-switch-over/README.md).

## Defects

None.

## Related

- [ADR-010](../../adr/ADR-010-align-the-ui-with-the-dhcw-design-system.md),
  [ADR-016](../../adr/ADR-016-one-pnpm-workspace-for-the-editor-public-site-and-api.md)
- [EPC-022](../_archive/EPC-022-monorepo-and-backend-foundation/README.md)
