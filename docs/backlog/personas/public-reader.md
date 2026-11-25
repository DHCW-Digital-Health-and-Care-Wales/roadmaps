# Public Reader

- **Role**: Anyone who reads published roadmaps on the public site (`apps/public-site/`).
- **Status**: Accepted — derived from [Product Lead](product-lead.md) A13 (2026-11-10),
  `apps/public-site/AGENTS.md` and owner answers P1–P2 on 2026-11-25. Still to check with
  real health board stakeholders, Welsh Government readers and members of the public.
- **Last updated**: 2026-11-25

Read this before designing a story, a UX prototype or copy for `apps/public-site/`, or
writing field hints and examples in the editor that guide what Product Leads publish.
Each owner answer is cited by its number under [Owner answers](#owner-answers).

## Where this tool sits

- The public site (`apps/public-site/`) is a separate, unauthenticated website showing
  only **published roadmaps** and their published items.
- Public readers never sign in and never see the internal Roadmap Editor, unpublished
  drafts, retired roadmaps or internal member lists.
- Today the public site is prerendered from a nightly snapshot of the shared spreadsheet;
  later it reads the unauthenticated public read API (ADR-015, EPC-028).

## Who they are

In priority order (Product Lead A13, P1):

1. **Health boards and Welsh Government stakeholders** — service leads, digital leads,
   planners and policy colleagues checking what DHCW (and, later, other NHS Wales
   organisations) is working on for their organisation and area of care.
2. **DHCW staff** — colleagues outside a product's immediate team who want a quick,
   public view of direction without needing editor access.
3. **Patients and the public** — people in Wales wanting to understand how NHS Wales
   digital services that affect their care are improving.

- **Devices and environments**: desktop and phone are equally important (P1). Health
  board and Welsh Government stakeholders often read on locked-down NHS/government
  desktops; patients and the public often arrive on phones, sometimes on slow connections
  or with assistive technology. Pages must meet WCAG 2.2 AA, reflow cleanly at 320 px and
  400% zoom, and remain readable with JavaScript turned off (`apps/public-site/AGENTS.md`).
- **Languages**: English and Welsh (`en` and `cy`; ADR-008). The whole interface is
  available in both languages, while roadmap content is mostly English today (Product Lead
  A4).

## Goals and jobs to be done

- **Understand product direction**: see at a glance what a product is doing **Now**,
  **Next** and **Later**, plus what was recently delivered or intentionally not being
  done (P1).
- **Find what applies to them**: filter roadmaps and items by their NHS Wales
  organisation (or All Wales), area of care (category), product family or tag (P1).
- **Judge freshness**: check a roadmap's **Last updated** date to know whether the plan is
  current (P1).
- **Share and respond**: copy a link to a specific roadmap or filtered view for a
  colleague or meeting, or send feedback on the public site (P1).

## Pain points and risks

- **Internal jargon and acronyms.** Project codenames, DHCW-internal team names and
  unexplained technical acronyms alienate health board stakeholders and exclude patients
  and the public (P1).
- **Mistaking horizons for committed dates.** Reading "Now" or "Next" as a guaranteed
  delivery quarter creates broken expectations; horizons communicate sequence and intent,
  not fixed deadlines (P1).
- **Stale roadmaps.** A roadmap with no recent **Last updated** date — or content that has
  drifted out of date — erodes trust in the whole site (P1).
- **Dishonest Welsh fallback.** Showing English roadmap content inside a Welsh interface
  without signalling it plainly feels broken to Welsh readers (P1).

## What they need from the product

Behaviours, not screens:

- Fast, accessible, no-sign-in pages that work equally well on a phone, a locked-down
  NHS desktop, a screen reader or a browser with JavaScript off (P1).
- Clear, scannable cards written in plain language around outcomes (what changes, and for
  whom), fitting comfortably on a phone screen (Product Lead A11, P1).
- Reliable filtering by NHS Wales organisation, category, family and tag, with shareable
  URLs (P1).
- Honest freshness ("Last updated") and clear framing that Now / Next / Later are
  horizons, not delivery dates (P1).
- Full Welsh interface copy, with English-only roadmap content marked honestly in the
  markup and UI (`<ContentText>`, `apps/public-site/AGENTS.md`, P1).

## Writing for them: copy and UX implications

- **Plain English and Welsh, sentence case**, matching the DHCW voice. Write outcomes
  before outputs ("Patients can…", "Clinicians see…"), never internal team jargon.
- **Keep horizons distinct from dates.** Explain Now, Next and Later plainly so readers
  never read them as guaranteed delivery dates.
- **No internal editor vocabulary.** Speak "roadmap", "Now", "Next", "Later",
  "Last updated" and "What this covers" — never "placement", "draft", "change set" or
  "tenant".
- **Privacy by default.** No cookies or third-party tracking beyond the disclosed Simple
  Analytics script (`apps/public-site/AGENTS.md`); state privacy plainly.
- **Shapes editor hints too.** Field hints and examples in the Roadmap Editor model what
  this reader needs to understand an item without asking a Product Lead to translate it.

## Out of scope for them

They never see, and the public site never mentions:

- The internal Roadmap Editor, sign-in, accounts, tenants or member lists.
- Unpublished drafts, private scratch, unplaced items, retired roadmaps or change history.
- Spreadsheets, worksheets, APIs, sync schedules or internal IDs.

## Owner answers

Given by the owner on 2026-11-25 (building on Product Lead A13 from 2026-11-10); still to
be checked with real stakeholders and public readers.

1. **P1, scope, devices, goals and pain points**: include all three A13 reader tiers in
   priority order; treat desktop and phone as equally important (including assistive tech
   and low-JS / low-bandwidth environments); cover finding Now/Next/Later direction,
   filtering by NHS Wales organisation or area of care, checking freshness, and sharing or
   giving feedback; record jargon, mistaking horizons for dates, stale roadmaps and
   dishonest Welsh fallback as the primary pain points.
2. **P2, status and roster**: add `public-reader.md` alongside the three editor personas,
   marked Accepted (pending real-reader validation), while keeping Platform operator out
   of `personas/`.
