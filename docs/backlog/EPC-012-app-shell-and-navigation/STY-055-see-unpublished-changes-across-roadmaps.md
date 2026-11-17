# STY-055: A Product Lead sees which roadmaps have unpublished changes, from any page

- **Status**: Proposed — the count lives in STY-054's navigation (D1); Disconnect's
  prompt names the roadmaps (D2)
- **Type**: Feature
- **Area**: Features/UI + i18n (en + cy) + E2E
- **Epic**: EPC-012-app-shell-and-navigation
- **Depends on**: STY-054 (hard: the count lives in its navigation, or its header)
- **Binding ADRs**: ADR-012, ADR-010, ADR-008
- **Suggested model**: Sonnet — reads the existing pending-changes store; one
  indicator and its list

## Summary

Pending changes live in memory per roadmap, and only that roadmap's page and card say
so. On the families page or another roadmap, nothing tells a Product Lead that work is
waiting to be published, and losing it or forgetting it are the persona's top risks.
This story shows, from every page, how many roadmaps have unpublished changes, and
leads to each. It changes nothing about how changes are kept or published.

## Acceptance criteria

### S1: The count from any page

**Given** pending changes on Product A and Product B
**When** the Product Lead is on the families page
**Then** the shell says 2 roadmaps have unpublished changes

### S2: To each one

**Given** that count
**When** the Product Lead chooses it, or a roadmap in the navigation
**Then** they reach each roadmap with changes; each is marked in the navigation

### S3: Nothing pending

**Given** no pending changes anywhere
**When** the Product Lead looks at the shell
**Then** it shows no count

### S4: Announced, not noisy

**Given** a screen reader
**When** a change is made or published
**Then** the count's change is available, without announcing it on every edit

## Decisions

- **D1** (owner, 2026-11-17, EPC-012 grilling round 3; answers former Q1 with (a)): a dot beside each
  roadmap with changes in STY-054's navigation, and "2 roadmaps have unpublished
  changes" at its top, leading to each. No chip in the top bar.
- **D2** (owner, 2026-11-17, EPC-012 grilling round 3; answers former Q2 with (a)): Disconnect's prompt
  names the roadmaps with unpublished changes, each linking to it.
- **D3** (agent, 2026-11-17): with the navigation folded to its rail (STY-054 D5), the
  rail keeps each roadmap's dot and the total, so S1 holds folded; over a top-bar
  chip, which the owner declined in D1.

## Out of scope

- Keeping changes across a reload: drafts, after the MVP (persona A9, A10).
