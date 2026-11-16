---
name: ux-prototypes
description: Prototype UX designs before a feature is built, as alternatives for the owner to choose from, either static desktop and phone frames per user journey or one component working in isolation to try. Use for "prototype ux designs for x", design options or mock-ups of planned screens, or a working prototype of a field or control.
---

# UX prototypes

Produce a **design review**: alternative designs for each main journey,
grounded in the people who use the product and the agreed contract. The
designs are one page under `docs/analysis/`, compared in an analysis that ends
with the owner's decisions.

Default to three designs per journey. The page takes one of two **shapes**,
chosen in step 2: **frames**, static mock-ups of whole screens, or a **working
component**, one control the owner can try.

## 1. Ground the journeys

Read these before drawing anything:

- the epic or story, and its binding Accepted ADRs
- `docs/GLOSSARY.md`
- who the reader is: the Product Lead persona
  (`docs/backlog/personas/product-lead.md`), a DHCW Product Lead managing
  their products' public Now / Next / Later roadmaps, mostly on a desktop with
  the phone as a second device. The public site is a separate app; draw only
  this editor. State in the inventory which of the persona's assumptions each
  journey relies on. Keep connecting to Google out of the designs unless the
  journey is about it
- the existing screens each journey touches, in `src/features/`,
  `src/components/layout/` and `src/routes/`, for navigation, page layout and
  the components a design would reuse (`src/components/ui/`)

Done when you hold an **inventory**. Each journey in it has its reader, device,
place, owning story, and that story's acceptance scenarios. Group journeys that
share a screen into main journeys. List each excluded journey with its reason,
such as belonging to a deferred epic.

## 2. Choose the shape and what varies

Choose the shape by what the owner has to judge:

- **Frames**, when it is something seen: where things go on a screen, what a
  state shows, how a journey moves between screens. Each design is a static
  desktop frame and phone frame.
- **Working component**, when it is something done: how one control behaves
  under the hand as the Product Lead types, pastes, reorders, nests or removes,
  by keyboard and by touch. Each design is the control itself, working, inside
  the card, form or dialog that holds it.

A request that names its shape has chosen it. An epic with both kinds of
question takes an analysis of each. When the open question is the rule the
control keeps, not how it is worked, use `logic-prototype`.

Then write down what every design shares: the contract's invariants and the
product's existing look. The comparison is between interaction models, so
choose designs that differ in their model. For a journey, these three usually
separate cleanly:

- **inline**: the action sits on the existing screen
- **guided**: a focused flow, drawer or wizard
- **overview** or **mode**: a new place or state built for the task

For a component, the models are ways of working the same value, such as a
type-ahead box, a row per entry, a tick list and one line of text.

Done when the shape is stated with its reason, and every main journey has its
designs named, each with its model.

## 3. Fix the sample world

Write one sample-data sheet before drawing; every design derives from it. It
holds:

- today's date
- the cast: the invented Product Lead, roadmaps and roadmap items the designs
  show: each roadmap's name, and each item's placement, title, description,
  expected outcomes and tags, written as a real Product Lead would for the
  public and no longer than one phone-sized card
- every entity's state: a roadmap published or not, out of step or stale; which
  edits are pending and what publishing them would change; a co-lead's change
  where a journey shows a conflict; the connection state only where a journey
  shows it
- every derived value a design shows, such as a count of roadmaps or of
  pending edits
- the awkward cases planted on purpose, such as "patient" beside "Patients"

A working component's world is small: the one item or roadmap that holds the
control, and whatever else the control reads.

Show a date only where the product shows one, such as a roadmap's Last
updated, and never after today. Name a design's moments by state: "before
publishing", "just published".

Keep the sheet in the scratchpad. When a later analysis draws the same world,
commit the sheet as `docs/analysis/{epic}-ux-sample-world.md`; that analysis
only adds to it, and every state and count already written stays true.

Done when each entity has exactly one state at each named moment, and every
derived value agrees with the rows it counts.

## 4. Draw

Read the shape's reference and draw by it: `references/frames.md` or
`references/working-component.md`. In either shape:

- **Copy.** Write the designs' copy in the product's voice from the copywriter
  skill, reusing strings from `src/i18n/locales/en.ts` where a screen already
  says the thing. It is draft, in English only; Welsh follows with the build.
  Rationale goes in the analysis, not on the designs.
- **Elements.** Use real `<button>`, `<a>` and `<input>` elements with
  accessible names, even in a static mock-up. A choice card is a button with a
  `radio` or `checkbox` role and `aria-checked`. Every design shares one page,
  so prefix each `id` with its design.

Done when every main journey has all its designs drawn as its shape's
reference says, and every count drawn matches the rows drawn.

## 5. Trace the scenarios

For each design, trace every acceptance scenario of the stories it covers to
one of three outcomes:

- **shown**, naming the frame, or the thing to try, that shows it
- **departure**, recorded as a decision in the analysis
- **not yet drawn**, listed in the analysis

The details a shortcut tends to skip are:

- the loading, empty and error states, and the retry or reconnect action
- the expired-session path and what stays on screen through it
- a state the current screen already handles, such as a roadmap that is not
  published or an unplaced item
- what the design leaves pending, and where the Product Lead sees it before
  publishing
- keyboard focus and the screen-reader name of each control

Also trace each read and write a design uses against the story that supplies
it, and each stored state a read returns (a roadmap that is not published)
against the story that first writes it (the epic's `delivery-notes.md` may
name it). List a missing one in _Decisions needed_, as an owner question raised
with the designs, not after the owner has chosen.

Done when no scenario, read or write is left untraced. Keep the trace in the
scratchpad.

## 6. Write the analysis

Write `docs/analysis/{topic}-ux-analysis.md` under the analysis rules in
`docs/AGENTS.md`. Put the page in a sibling folder:
`docs/analysis/{topic}-ux-analysis/prototypes.html`.

Use these sections, in this order:

1. A head giving the scope and the base SHA, naming the page's shape, saying
   that only documents and one prototype page were added, and linking any
   shared sample sheet.
2. _Readers and where they are_.
3. _Journeys covered_: a table of groups, their journeys and their stories,
   plus the exclusions.
4. _What every design shares_.
5. One section per journey. Describe its situation, then give a table with
   columns for Design, Idea, Strengths and Risks. End with a
   **Recommendation** naming one primary design and any add-ons.
6. _Decisions needed_.
7. _Not yet drawn_.
8. _What does not change_.
9. _Related_.

Link the analysis from the _Related_ list of the epic or record it supports.

Done when every section is present in that order, and every departure and every
missing read or write from step 5 has a row in _Decisions needed_.

## 7. Check

Run the check on the page, in either shape. It uses `@playwright/test` from the
root `pnpm install` and a Chromium (`pnpm exec playwright install chromium`).
Write its screenshots to the scratchpad.

```bash
node .agents/skills/ux-prototypes/scripts/check-page.mjs docs/analysis/{topic}-ux-analysis/prototypes.html <scratchpad>/shots
```

The check runs by hand, not in CI: it is a local aid for throwaway design
pages. It screenshots every design at 1440px wide. It fails when the page
scrolls sideways at 375px wide, a design's navigation has no native links or
buttons, a `.rad` or `.chk` mark sits outside a native control, or an element
id repeats. It presses nothing and cannot see clipping inside a frame: the
shape's reference says what to check by eye and by hand.

For system Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its
executable; the scripts' own tests take the same setting. If the browser blocks
file URLs, serve the page and pass its HTTP(S) URL instead of a file path.

Done when the check passes and the shape's own check is done.

## 8. Review and deliver

Deliver through the PR path in `.agents/skills/implement-story/SKILL.md`. Brief the reviewers per
`.agents/skills/implement-story/references/delegation.md`, giving each the
committed page and analysis plus:

- **`code-reviewer`**: the inventory, the scenario trace and the sample sheet.
  It checks each design against the contract and the stories, and checks that
  the sample data agrees across designs. For a shared sheet, it also checks
  that every state and count the sheet already held still holds.
- **`quality-reviewer`**: the analysis rules, the glossary and the copywriter
  voice.

## Delegation

Draw every design in the main agent. One author keeps the visual language and
the sample world coherent. Parallel drafting multiplies the cross-design
inconsistencies that reviewers then have to catch.

Delegate in one case beyond the reviewers above. For a large epic, an
`Explore` worker can build step 1's inventory, keeping the stories out of the
main context.
