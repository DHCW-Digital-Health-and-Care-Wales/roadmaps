---
name: ux-prototypes
description: Prototype UX designs before a feature is built, as alternatives for the owner to choose from. Use for "prototype ux designs for x", as static frames of planned screens on desktop and phone, or as a working component, one field or control to try inside the card or form that holds it.
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

- the epic or story, the epic's `delivery-notes.md`, and the Accepted ADRs
  that bind the story or the screens it changes
- `docs/GLOSSARY.md`
- who the reader is: the Product Lead persona
  (`docs/backlog/personas/product-lead.md`), a DHCW Product Lead managing
  their products' public Now / Next / Later roadmaps, mostly on a desktop with
  the phone as a second device. The public site is a separate app; draw only
  this editor. State in the inventory which of the persona's assumptions each
  journey relies on. Keep connecting to Google out of the designs unless the
  journey is about it
- the existing screens each journey touches, in `src/features/` and
  `src/components/layout/`, for navigation, page layout and the components a
  design would reuse (`src/components/ui/`). See them as the app draws them
  too, since class names alone misdraw the shell: capture each at 1280px and
  375px wide with Google faked, by the first paragraph of _Capture_ in
  `.agents/skills/implement-story/references/screenshots.md`. A scratch spec
  that imports `tests/e2e/fixtures/test.ts`, run against the build served by
  `vite preview` on a free port, is the shortest way

A record not yet grilled has open questions where its scenarios will be. Ask
the owner before drawing for them: list each open question that bears on the
journeys, with its options, and ask which they want.

- **Narrow**: settle the questions first, by the `grilling` skill, so the
  designs cover only what is left.
- **Explore**: leave them open, so the designs show every option and help
  decide.

The owner may settle some questions and leave the rest; a request that says
which has answered. Each answer goes into the record's Decisions, with the
sweep `docs/AGENTS.md` sets. Each option of each question still open then
stands for a scenario.

Done when you hold an **inventory**, and the owner has said which open
questions the designs explore. Each journey in the inventory has its reader,
their device and where they are, its owning story, and that story's acceptance
scenarios or open questions.
Group journeys that share a screen into main journeys. List each excluded
journey with its reason, such as belonging to a deferred epic.

## 2. Choose the shape and what varies

Choose the shape by what the owner has to judge:

- **Frames**, when it is something seen: where things go on a screen, what a
  state shows, how a journey moves between screens. Each design is a static
  desktop frame and phone frame.
- **Working component**, when it is something done: how one control behaves
  under the hand as the Product Lead types, pastes, reorders or nests, by
  keyboard and by touch. Each design is the control itself, working, inside its
  **host**: the card, form, dialog or part of a page that holds it.

A request that names its shape has chosen it. A journey with a control in it
is frames, unless how the control is worked is the question. An epic with
questions for both shapes takes an analysis of each. A question about a rule
stays on the page beside one of look or feel; when rules are a record's only
open questions, use `logic-prototype`.

Read the shape's reference before going on: `references/frames.md` or
`references/working-component.md`.

Then write down what every design shares: the contract's invariants and the
product's existing look. The comparison is between interaction models, so
choose designs that differ in their model, the way a thing is done; the
shape's reference names the usual ones. An open question about how a thing is
done is answered by the designs: each option is a design.

Any other open question, about a rule such as whether a change waits to be
published or about what a screen says, decides no design, or the comparison
cannot tell its answer from the model. Show each of its options on every
design it bears on, as the shape's reference says; an option that would turn
one design into another is shown on the design it fits. The exception is a
journey with no question of how a thing is done: there each option is a
design.

Done when the shape is stated with its reason, and every main journey has its
designs named, each with its model or, in a journey with no question of how,
its option.

## 3. Fix the sample world

Write one sample-data sheet before drawing; every design derives from it. It
holds:

- today's date
- the cast: the invented Product Lead, roadmaps and roadmap items the designs
  show: each roadmap's name, and each item's placement, title, description,
  expected outcomes and tags, written as a real Product Lead would for the
  public and no longer than one phone-sized card
- every entity's state: a roadmap published or not, or out of step; which edits
  are pending and what publishing them would change; a co-lead's change where a
  journey shows a conflict; the connection state only where a journey shows it
- every derived value a design shows, such as a count of roadmaps or of
  pending edits
- the rule the designs follow wherever drawing needs one no record settles,
  which _Decisions needed_ then asks
- the awkward cases planted on purpose, such as "patient" beside "Patients"
- where the question is what publishing writes, the data as the data source
  holds it, such as the order a roadmap's items are stored in

Show a date only where the product shows one, such as a roadmap's Last
updated, and never after today. Name a design's moments by state: "before
publishing", "just published".

Keep the sheet in the scratchpad when one analysis uses it. When several
analyses will share one world, such as an epic's journey groups delivered as
separate PRs, the first commits it beside them as
`docs/analysis/{epic}-ux-sample-world.md`. A later analysis only adds to it,
and every state and count already written stays true. Correct a wrong fact in
the sheet and in every merged analysis and page that shows it, in one PR, and
name the correction to the code-reviewer; a decided analysis keeps its text and
names the correction in its _Outcome_.

Done when each entity has exactly one state at each named moment, and every
derived value agrees with the rows it counts.

## 4. Draw

Draw by the shape's reference. In either shape:

- **Copy.** Write the designs' copy in the product's voice from the copywriter
  skill, reusing strings from `src/i18n/locales/en.ts` where a screen already
  says the thing. It is draft, in English only; Welsh follows with the build.
  Rationale goes in the analysis, not on the designs.
- **Elements.** Use real `<button>`, `<a>` and `<input>` elements with
  accessible names, even in a static mock-up. A choice card is a button with a
  `radio` or `checkbox` role and `aria-checked`. Every design shares one page,
  so prefix each `id` with its design.

Done when every main journey has all its designs drawn, and assembled for
frames, as its shape's reference says.

## 5. Trace the scenarios

For each design, trace every acceptance scenario of the stories it covers to
one of three outcomes:

- **shown**, naming the artboard, the thing to try or the readout that shows
  it
- **departure**, recorded as a decision in the analysis
- **not yet drawn**, listed in the analysis

For a record not yet grilled, trace each option of each open question to
where it is shown. A design that is one option is no departure from another;
an option shown nowhere is not yet drawn; an option a design brings that the
record does not list is a row in _Decisions needed_.

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
with the designs, not after the owner has chosen. Trace each design against
the decisions of its binding ADRs too: a design that reopens one is a row
there.

Done when no scenario or option, read, write or ADR decision is left untraced.
Keep the trace in the scratchpad.

## 6. Write the analysis

Write `docs/analysis/{topic}-ux-analysis.md` under the analysis rules in
`docs/AGENTS.md`, with `{topic}` naming the job, such as `remove-a-roadmap`.
Put the page in a sibling folder:
`docs/analysis/{topic}-ux-analysis/prototypes.html`.

Use these sections, in this order:

1. A head giving the date, the question, the scope and the base SHA, naming
   the page's shape, saying that only documents and one prototype page were
   added, and summarising the sample world or linking its shared sheet.
2. _Readers and where they are_.
3. _Journeys covered_: a table of groups, their journeys and their stories,
   plus the exclusions.
4. _What every design shares_.
5. One section per journey. Describe its situation, then give a table with
   columns for Design, Idea, Strengths and Risks. End with a
   **Recommendation** naming one primary design and any add-ons.
6. _Decisions needed_, each row citing the open question it answers, where the
   record has one.
7. _Not yet drawn_.
8. _What does not change_.
9. _Related_.

Link the analysis from the _Related_ list of the epic it supports.

Done when every section is present in that order, and _Decisions needed_ holds
every row steps 3 and 5 call for: each rule the sheet chose, departure, missing
read or write, ADR decision reopened and option the record lacks.

## 7. Check

Format the page and the analysis with Prettier, which `pnpm format:check`
holds them to. Then run the check on the page, in either shape. It uses
`@playwright/test` from the root `pnpm install` and a Chromium
(`./node_modules/.bin/playwright install chromium`). Write its screenshots to the
scratchpad.

```bash
node .agents/skills/ux-prototypes/scripts/check-page.mjs docs/analysis/{topic}-ux-analysis/prototypes.html <scratchpad>/shots
```

The check runs by hand, not in CI: it is a local aid for throwaway design
pages. It screenshots every design at 1440px wide. It fails when the page's
script throws as it opens, the page scrolls sideways at 375px wide, a design's
navigation has no native links or buttons, a `.rad` or `.chk` mark sits
outside a native control, or an element id repeats. A pass says the page is
well formed, not that a design is right or works: the shape's reference says
what to check by eye and by hand.

For system Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its
executable, and confirm the setting on the scripts' own fixtures
(`node --test '.agents/skills/ux-prototypes/scripts/*.test.mjs'`). If the
browser blocks file URLs, serve the page and pass its HTTP(S) URL instead of a
file path.

Done when the check passes and the shape's own check is done.

## 8. Review and deliver

Deliver through the PR path in `.agents/skills/implement-story/SKILL.md`. Brief the reviewers per
`.agents/skills/implement-story/references/delegation.md`, giving each the
committed page and analysis plus:

- **`code-reviewer`**: the inventory, the scenario trace and the sample sheet,
  by their scratchpad paths.
  It checks each design against the contract and the stories, and checks that
  the sample data agrees across designs. For a shared sheet, it also checks
  that every state and count the sheet already held still holds or is a named
  correction, carried through as step 3 says.
- **`quality-reviewer`**: the analysis rules, the glossary and the copywriter
  voice.

## Delegation

Draw every design in the main agent. One author keeps the visual language and
the sample world coherent. Parallel drafting multiplies the cross-design
inconsistencies that reviewers then have to catch.

Delegate in one case beyond the reviewers above. For a large epic, an
`Explore` worker can build step 1's inventory, keeping the stories out of the
main context.
