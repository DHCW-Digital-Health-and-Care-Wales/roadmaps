# Product Lead

- **Role**: Product Lead at DHCW (Digital Health and Care Wales), using the DHCW Roadmap
  Editor to manage the public roadmaps of the products they lead.
- **Status**: Accepted — the owner answered A1–A13 on 2026-11-10; A6 is deferred until
  after the MVP. Still to check with real Product Leads.
- **Last updated**: 2026-11-14 (format ownership: the editor adds a roadmap's row and
  tab; EPC-011 STY-040).

Read this before designing a story, a UX prototype or copy. Each owner answer is cited
by its number under [Owner answers](#owner-answers); the rest comes from the brief.

## Where this tool sits

- The editor is an internal tool: only DHCW staff use it.
- The public never sees the editor. A **separate app**, the public site, reads the same
  shared data source and shows the roadmaps publicly. Today that data source is a shared
  Google spreadsheet; later, a PostgreSQL database behind an API.
- So what a Product Lead publishes here becomes public through the other app. The editor
  never renders the public site; it can only say what the public will see.

## Who they are

- A Product Lead accountable for one or more DHCW products. A product can have more than
  one lead, so a roadmap may be edited by several people (A12).
- Not a developer. They think in products, services and outcomes, never in data sources,
  accounts or tokens.
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
  patients and the public (A13).
- **Move items between horizons**: shift a roadmap item from Later to Next or Next to Now,
  or back, as priorities change.
- **Write outcome-focused items**: give each roadmap item a title, a description and
  expected outcomes that say what changes, and for whom.
- **Tag items**: free-text tags of their own choosing today (A8).
- **Add other details where appropriate**, without every item needing every field.

## Pain points and risks

- **Publishing by mistake.** Publishing makes edits public through the public site, so a
  half-finished edit, a typo or an internal codename must never reach it unnoticed. For
  the MVP, nothing is public until they choose **Publish** (A9, A10).
- **Losing work.** A meeting starts or the laptop closes mid-edit; with 30 minutes a week,
  redoing work is costly (A1, A10).
- **Clashing with a co-lead.** Two leads on one product can edit the same roadmap (A12);
  one must not silently overwrite the other.
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

- See each of their roadmaps as Now, Next and Later at a glance, and which are stale (A7).
- Edit a roadmap item where they see it, and move it between horizons without retyping
  it.
- Gather edits as pending until they choose **Publish**, which pushes them all to the
  shared data source at once. No review or draft step in the MVP; drafts, with autosave
  that never goes straight to live, come later (A9, A10).
- Know which edits are pending, and what publishing will change, before they publish.
- Be told, not overwritten, when a co-lead has changed the same roadmap (A12).
- Never lose pending edits to a closed tab or an expired session. EPC-005 meets the
  expired session in full and the closed tab only by asking first: edits stay in memory
  (ADR-012), and keeping them across a reload waits for drafts (A9, A10).
- Do the small jobs (check, move, fix a typo) on a phone; long writing happens on the
  desktop (A2).

## Writing for them: copy and UX implications

- **Plain English, sentence case**, the product's existing voice. Speak "roadmap",
  "roadmap item", "tag", "horizon", "expected outcome", "Now", "Next", "Later" and
  "publish"; never storage words.
- **Our copy is internal; their content is public.** Interface copy talks to DHCW staff.
  Hints and examples model the voice wanted on the public site: short, concrete,
  jargon-free, written first for health boards and Welsh Government stakeholders (A13).
- **Outcome language.** Field hints steer to "what will be better, for whom", not "what
  we will build". An example outcome helps more than a rule.
- **Publish is the moment that matters.** Say plainly that publishing makes the pending
  edits public on the public site, and confirm afterwards what was published. Routine
  editing stays quiet.
- **Errors in their terms.** First say whether their pending edits are safe, then what to
  do next; never a status code.
- **Welsh.** The interface is in English and Welsh (ADR-008). Welsh roadmap content is
  optional today (A4): never block publishing on it, but keep room for a Welsh version of
  each field.
- **Item card, not roadmap card.** The card a roadmap item fits on is an _item card_; a
  _roadmap card_ is a roadmap's entry in the roadmap list (`docs/GLOSSARY.md`).

## Out of scope for them

They never need to know, and the interface never mentions:

- Google accounts, OAuth, consent, scopes, access tokens or session mechanics, beyond
  "connect" and "reconnect" while sign-in exists.
- Spreadsheets, worksheets, tabs, cell ranges or rows.
- The data source, the API that will replace it, or that it will change.
- How the public site works, beyond "published edits appear on the public site".
- Internal IDs, record keys or anything from the URL.

Sign-in is plumbing. Design time goes to editing and publishing roadmap items.

## Owner answers

Given by the owner on 2026-11-10; still to be checked with real Product Leads.

1. **A1, time**: about 30 minutes a week, competing with all their other duties.
2. **A2, devices**: mostly desktop; mobile is needed as a secondary device.
3. **A3, today's tool**: a shared Google spreadsheet.
4. **A4, Welsh content**: not required today, and no existing roadmap has Welsh. It may
   become required. A Welsh translator will likely be needed, at least to verify
   translations if not write them, probably after an AI-generated first pass (not
   confirmed).
5. **A5, cadence**: probably monthly; more often for newer products, less often for
   mature ones later in their lifecycle.
6. **A6, approval before publishing**: not decided; a consideration after the MVP.
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

## Open questions

- A6: who, if anyone, must approve an item before it is published?

## Answered questions

- **How the editor and the public site agree the data source's format, and who owns a
  change to it** (owner, 2026-11-11, EPC-005 grilling Q14, Q28; 2026-11-14, EPC-011
  STY-040 D1): the owner owns it. The editor adds the `Item ID` column, any missing
  column it must write and, since STY-040, a new roadmap's row in the roadmap index and
  its tab, a copy of the `Template` tab. It reads the `Template` tab's header row to
  check it and never changes the tab, and each record that changes what is written says
  so; the owner updates the `Template` tab and the public site's documentation
  (ADR-012).
