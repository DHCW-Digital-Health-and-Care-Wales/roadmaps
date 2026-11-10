# Product Lead

- **Role**: Product Lead at DHCW (Digital Health and Care Wales), using the DHCW Roadmap
  Editor to manage the public-facing roadmaps of their own product.
- **Status**: Proposed — assumptions to validate with real Product Leads.
- **Last updated**: 2026-11-10.

Read this before designing a story, a UX prototype or copy. Statements marked
_(assumption)_ are not in the owner's brief; each one is a numbered question under
[Assumptions to validate](#assumptions-to-validate). Unmarked statements come from the
brief.

## Who they are

- A Product Lead accountable for a digital product in NHS Wales. They manage their own
  roadmaps and no one else's.
- Not a developer. They think in products, services and outcomes, never in data sources,
  accounts or tokens.
- Time-poor: roadmap upkeep competes with delivery, stakeholder and governance work
  _(assumption, A1)_.
- Usually on a laptop between meetings; sometimes on a phone _(assumption, A2)_. A task
  started on one device may be finished, or only checked, on the other.
- Comfortable with everyday office tools; not expected to learn a specialist planning
  tool _(assumption, A3)_.
- Works in English, Welsh or both; public output must exist in both languages to meet the
  Welsh Language Standards _(who writes the Welsh is an assumption, A4)_.

## Goals and jobs to be done

- **Keep the roadmap current**: when plans change, update the affected roadmap items in
  minutes, not as a quarterly project _(cadence is an assumption, A5)_.
- **Communicate direction**: give the public and stakeholders an honest, readable view of
  what the product is doing now, next and later.
- **Move items between horizons**: shift a roadmap item from Later to Next or Next to Now,
  or back, as priorities change.
- **Write outcome-focused items**: give each roadmap item a title, a description and an
  expected outcome that says what changes for patients, staff or the public.
- **Tag consistently**: add tags so readers, and other teams, can group and find items
  across products.
- **Add other details where appropriate**, without every item needing every field.

## Pain points and risks

- **Publishing something wrong or premature in public.** A roadmap item is a public
  statement by NHS Wales. A draft, a typo, an internal codename or an unconfirmed date
  going live is the worst outcome for them _(the severity is an assumption, A6)_.
- **Jargon.** Internal project names, acronyms and technical terms leak into public items
  and make them meaningless to the public.
- **Welsh parity.** An item updated in English but not in Welsh breaks the standards and
  shows one audience a different roadmap from the other.
- **Stale roadmaps.** A roadmap nobody has touched for months misleads readers and
  erodes trust; nothing today tells the Product Lead it is stale _(assumption, A7)_.
- **Inconsistent tags across products.** Each lead invents their own tags ("Patients",
  "patient", "Citizen"), so cross-product grouping fails _(whether tags are a shared,
  controlled list is an assumption, A8)_.
- **Saying too much.** An item that needs more than a phone screen to read has stopped
  being a roadmap item and become a project plan.

## What they need from the product

Behaviours, not screens:

- See each of their roadmaps as Now, Next and Later at a glance, and spot what has changed
  or gone stale.
- Edit a roadmap item where they see it, and move it between horizons without retyping
  it.
- Know, before anything is public, exactly what the public will see, in both languages
  _(whether there is a draft/publish step is an assumption, A9)_.
- Be warned when the English and Welsh versions of an item differ in what they cover, or
  one is missing.
- Pick tags from what already exists before creating a new one.
- Be stopped, gently, when an item outgrows its card: a visible budget, not a silent
  truncation.
- Never lose work: an interrupted edit (a meeting starts, the laptop closes) survives or
  is clearly flagged _(assumption, A10)_.
- Do the small jobs (check, move, fix a typo) on a phone; long writing can wait for the
  laptop _(assumption, A2)_.

## Writing for them: copy and UX implications

- **Plain English, sentence case**, the product's existing voice. Speak "roadmap",
  "roadmap item", "tag", "horizon", "outcome", "Now", "Next", "Later"; never storage
  words.
- **Their content is public; our copy is not.** Interface copy talks to the Product Lead.
  Prompts, hints and examples should model the public voice we want in their items:
  short, concrete, jargon-free.
- **Outcome language.** Field hints steer to "what will be better, for whom", not "what
  we will build". An example outcome in the hint helps more than a rule.
- **The card budget.** A roadmap item's card is no bigger than an iPhone screen, in either
  language. Design and test against Welsh, which often runs longer _(assumption, A11)_.
  Character limits, if used, come from that budget, not from storage.
- **Confirm consequences, not mechanics.** "This will show on the public roadmap" beats
  "Save changes?". Confirm only what is public or destructive; routine edits stay quiet.
- **Errors in their terms.** Say what they can do next ("Try again", "Your changes are
  saved on this device"), never a status code.
- **Bilingual by default.** Every field that reaches the public has an English and a
  Welsh value, and the interface makes the missing one obvious.
- **Item card, not roadmap card.** The card a roadmap item fits on is an _item card_; a
  _roadmap card_ is a roadmap's entry in the roadmap list (`docs/GLOSSARY.md`).

## Out of scope for them

They never need to know, and the interface never mentions:

- Google accounts, OAuth, consent, scopes, access tokens or session mechanics, beyond
  "connect" and "reconnect" while sign-in exists.
- Spreadsheets, worksheets, tabs, cell ranges or rows.
- The data source, the API that will replace it, or that it will change.
- Internal IDs, record keys or anything from the URL.

Sign-in is plumbing. Design time goes to editing, reviewing and publishing roadmap items.

## Assumptions to validate

Questions for the owner, to check with real Product Leads:

1. A1: How much time a week does a Product Lead spend on roadmap upkeep, and what does it
   compete with?
2. A2: What share of roadmap work happens on a phone, and which tasks (reading, moving,
   editing, writing) do they expect to do there?
3. A3: What do Product Leads use today to keep roadmaps, and what would make them switch?
4. A4: Who writes the Welsh text of a roadmap item — the Product Lead, a translation
   service, or a Welsh-speaking colleague — and how long does that take?
5. A5: How often does a roadmap change in practice: weekly, monthly, quarterly?
6. A6: Is publishing an inaccurate or premature item their biggest fear, and who else
   (comms, governance, a senior owner) must approve before it goes public?
7. A7: After how long does a roadmap count as stale, and should the product flag it?
8. A8: Are tags a shared list controlled centrally, free text per Product Lead, or both?
9. A9: Should changes go public immediately, or through a draft and publish step (with
   review)?
10. A10: Do Product Leads expect autosave, and what should happen to an unfinished edit?
11. A11: How much longer is Welsh copy typically, and does the card budget apply per
    language or to the longer of the two?
12. A12: Can a Product Lead own more than one product or roadmap, and can two leads share one?
13. A13: Who reads the public roadmap — patients and the public, NHS staff, suppliers — and in
    what order of priority?
