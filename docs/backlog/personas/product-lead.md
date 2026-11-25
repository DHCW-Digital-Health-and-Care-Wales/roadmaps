# Product Lead

- **Role**: Product Lead at an NHS Wales organisation (DHCW first), using the DHCW Roadmap
  Editor to manage the public roadmaps of the products they lead (the **Product Lead**
  shipped role in API mode, ADR-019).
- **Status**: Accepted — the owner answered A1–A13 on 2026-11-10 and updated this persona
  for multi-tenant API mode on 2026-11-25 (A14–A15; A6 closed via ADR-019 Option 2). Still
  to check with real Product Leads.
- **Last updated**: 2026-11-25 (multi-tenant API model, unassigned roadmaps and read-only
  lists; ADR-015, ADR-018, ADR-019).

Read this before designing a story, a UX prototype or copy. Each owner answer is cited
by its number under [Owner answers](#owner-answers); the rest comes from the brief and
binding ADRs.

## Where this tool sits

- The editor is an internal tool for staff of each participating NHS Wales organisation
  (DHCW first); nothing one tenant holds is visible to another (ADR-015, A14). A Product
  Lead who works across organisations can belong to more than one tenant and switches
  between them (ADR-018, ADR-019).
- The public never sees the editor. A **separate app**, the public site
  (`apps/public-site/`), reads the shared data source and shows published roadmaps to
  [public readers](public-reader.md). Today's live data source is a shared Google
  spreadsheet; the PostgreSQL-backed API (ADR-015) replaces it.
- So what a Product Lead publishes here becomes public through the other app. The editor
  never renders the public site; it can only say what the public will see.

## Who they are

- A Product Lead accountable for one or more products in their organisation. A product can
  have more than one assigned lead, so a roadmap may be edited by several co-leads (A12,
  ADR-019).
- Not a developer. They think in products, services and outcomes, never in data sources,
  database roles, OIDC subjects or tokens.
- Spends about 30 minutes a week on roadmaps, competing with all their other duties
  (A1). Every visit is short and purposeful.
- Mostly on a desktop; a phone is a secondary device that must still work (A2).
- Keeps roadmaps today in a shared Google spreadsheet (A3), so the editor must be quicker
  and safer than editing that spreadsheet directly.
- Writes in English. Welsh versions are not required today and no current roadmap has
  them, but they may become required (A4).

## Goals and jobs to be done

- **Keep the roadmap current**: about monthly; more often for a new product, less often
  for a mature one later in its lifecycle (A5).
- **Communicate direction**: give stakeholders and the public an honest, readable view of
  what the product is doing now, next and later. In priority order the public site's
  readers are health boards and Welsh Government stakeholders, then DHCW staff, then
  patients and the public (A13; see [public-reader.md](public-reader.md)).
- **Move items between horizons**: shift a roadmap item from Later to Next or Next to Now,
  or back, as priorities change.
- **Write outcome-focused items**: give each roadmap item a title, a description and
  expected outcomes that say what changes, and for whom.
- **Tag items and pick product groupings**: add and rename tags (`tags:edit`, ADR-019;
  free text today, A8) and choose a roadmap's family and category. In API mode, a
  [Tenant Admin](tenant-admin.md) maintains families, categories, organisations and tag
  retirement (ADR-019 Option 8); in today's Sheets mode, any connected lead edits them.
- **Add other details where appropriate**, without every item needing every field.
- **Work with co-leads and stay aligned with peers**: add co-leads to roadmaps they are
  assigned to (or unassign themselves; ADR-019), and read peer roadmaps across their
  organisation without changing them (A15).

## Pain points and risks

- **Publishing by mistake.** Publishing makes edits public through the public site, so a
  half-finished edit, a typo or an internal codename must never reach it unnoticed.
  Nothing becomes public until they choose **Publish** (A9, A10, ADR-012, ADR-015).
- **Losing work.** A meeting starts or the laptop closes mid-edit; with 30 minutes a week,
  redoing work is costly (A1, A10).
- **Clashing with a co-lead.** Two leads on one product can edit the same roadmap (A12);
  one must not silently overwrite the other.
- **Finding their own roadmaps and reading peer ones cleanly.** In a tenant with many
  products, they need to spot the roadmaps they are assigned to quickly, and opening an
  unassigned peer roadmap (or the read-only Families page in API mode) must feel calm and
  clear, not like an error or a screen full of disabled controls (A15).
- **Jargon.** Internal project names, acronyms and technical terms mean nothing to the
  stakeholders and public who read the public site.
- **Stale roadmaps.** A roadmap untouched for six weeks counts as stale (A7) and misleads
  its readers.
- **Inconsistent tags.** Free-text tags drift ("Patients", "patient", "Citizen"); a shared
  list will probably be wanted as the product grows (A8).
- **Saying too much.** An item that needs more than a phone screen to read has stopped
  being a roadmap item. The card size guides the detail; no limit is enforced yet (A11).

## What they need from the product

Behaviours, not screens:

- Spot their assigned roadmaps quickly in the roadmap list, while reading any peer
  roadmap in their organisation calmly with a quiet cue showing who can add them as a
  co-lead (A15).
- See each roadmap as Now, Next and Later at a glance, and which are stale (A7).
- Edit a roadmap item where they see it, and move it between horizons without retyping
  it.
- In API mode: keep private unsaved scratch, save to a shared draft with co-leads,
  publish deliberately when ready, view version history or restore a snapshot, and retire
  or reinstate an assigned roadmap (ADR-015, ADR-019, A14). Today's Sheets mode gathers
  pending edits in memory until **Publish**, asking before closing a tab and surviving an
  expired session (ADR-012, A9, A10).
- Know what has changed, and what publishing will change on the public site, before they
  publish.
- Be told, not overwritten, when a co-lead has changed the same roadmap (A12).
- Add co-leads to their assigned roadmaps, and browse Families/Categories read-only in
  API mode knowing an Admin maintains those lists (A15, ADR-019).
- Switch tenants cleanly if they belong to more than one organisation, always knowing
  which organisation they are acting in (ADR-018, ADR-019).
- Do the small jobs (check, move, fix a typo) on a phone; long writing happens on the
  desktop (A2).

## Writing for them: copy and UX implications

- **Plain English, sentence case**, the product's existing voice. Speak "roadmap",
  "roadmap item", "tag", "horizon", "expected outcome", "Now", "Next", "Later" and
  "publish"; never storage words.
- **Our copy is internal; their content is public.** Interface copy talks to NHS Wales
  staff (DHCW first). Hints and examples model the voice wanted on the public site: short,
  concrete, jargon-free, written first for health boards and Welsh Government stakeholders
  (A13; [public-reader.md](public-reader.md)).
- **Outcome language.** Field hints steer to "what will be better, for whom", not "what
  we will build". An example outcome helps more than a rule.
- **Publish is the moment that matters.** Say plainly that publishing makes changes
  public on the public site, and confirm afterwards what was published. Routine editing
  stays quiet.
- **Calm read-only states.** On an unassigned peer roadmap or read-only Families page,
  hide edit controls rather than showing disabled buttons or "access denied", and point
  quietly to who can help (an assigned lead or Admin; A15).
- **Errors in their terms.** First say whether their edits are safe, then what to do
  next; never a status code.
- **Welsh.** The interface is in English and Welsh (ADR-008). Welsh roadmap content is
  optional today (A4): never block publishing on it, but keep room for a Welsh version of
  each field.
- **Item card, not roadmap card.** The card a roadmap item fits on is an _item card_; a
  _roadmap card_ is a roadmap's entry in the roadmap list (`docs/GLOSSARY.md`).

## Out of scope for them

They never need to know, and the interface never mentions:

- OAuth/OIDC mechanics, consent scopes, access tokens, session hashes, database roles or
  row-level security — beyond signing in, managing their own Account page and switching
  tenants (or "connect" and "reconnect" while Sheets mode is live).
- Spreadsheets, worksheets, tabs, cell ranges or rows.
- The data source, the API that replaces Sheets, or that it is changing.
- How the public site works, beyond "published changes appear on the public site".
- Internal IDs, record keys or anything from the URL.
- Admin and operator jobs: inviting members, changing roles, running access reviews,
  maintaining shared lists in API mode, or creating tenants.

Sign-in is plumbing. Design time goes to editing and publishing roadmap items.

## Owner answers

Given by the owner on 2026-11-10 (A1–A13) and 2026-11-25 (A14–A15); still to be checked
with real Product Leads.

1. **A1, time**: about 30 minutes a week, competing with all their other duties.
2. **A2, devices**: mostly desktop; mobile is needed as a secondary device.
3. **A3, today's tool**: a shared Google spreadsheet.
4. **A4, Welsh content**: not required today, and no existing roadmap has Welsh. It may
   become required. A Welsh translator will likely be needed, at least to verify
   translations if not write them, probably after an AI-generated first pass (not
   confirmed).
5. **A5, cadence**: probably monthly; more often for newer products, less often for
   mature ones later in their lifecycle.
6. **A6, approval before publishing**: settled by ADR-019 Option 2 (2026-11-21) — any
   assigned Product Lead publishes, keeping `roadmaps:publish` separate so a later
   two-person approval rule needs no rework.
7. **A7, staleness**: six weeks without change is the suggested threshold.
8. **A8, tags**: free text per Product Lead today. A shared list will probably be
   desirable as the product develops.
9. **A9, publishing**: ideally draft and publish. The MVP may publish without drafts,
   which come later.
10. **A10, saving**: autosave probably, but tied to drafts so it never goes straight to
    live. For the MVP, a deliberate **Publish** pushes the pending edits directly, with no
    review or draft.
11. **A11, card budget**: not enforced yet; a later consideration.
12. **A12, ownership**: a Product Lead can lead more than one product, and a product can
    have more than one lead.
13. **A13, public readers**: all of them, in this order: health boards and Welsh
    Government stakeholders, then DHCW staff, then patients and the public.
14. **A14, Sheets → API framing** (2026-11-25): keep one enduring multi-tenant API
    persona, noting where live Sheets mode still differs today, and close A6 via ADR-019
    Option 2.
15. **A15, unassigned roadmaps and read-only lists** (2026-11-25): treat unassigned
    roadmaps as normal peer visibility (spot assigned roadmaps quickly in the list, calm
    read-only view on peer roadmaps with a quiet cue on who can add them as a co-lead);
    browse Families/Categories read-only knowing an Admin maintains them.

## Open questions

None.

## Answered questions

- **A6: who, if anyone, must approve an item before it is published?** (owner, 2026-11-21,
  ADR-019 Option 2; closed here 2026-11-25): any assigned Product Lead publishes without a
  separate approval step; `roadmaps:publish` stays a separate permission so a two-person
  approval rule can be added later without rework.
- **How the editor and the public site agree the data source's format, and who owns a
  change to it** (owner, 2026-11-11, EPC-005 grilling Q14, Q28; 2026-11-14, EPC-011
  STY-040 D1): the owner owns it. The editor adds the `Item ID` column, any missing
  column it must write and, since STY-040, a new roadmap's row in the roadmap index and
  its tab, a copy of the `Template` tab. It reads the `Template` tab's header row to
  check it and never changes the tab, and each record that changes what is written says
  so; the owner updates the `Template` tab and the public site's documentation
  (ADR-012).
