---
name: ux-prototypes
description: Prototype UX designs before a feature is built, as alternative designs per user journey, desktop and phone, for the owner to choose from. Use for "prototype ux designs for x", design options or mock-ups of planned screens for an epic or story.
---

# UX prototypes

Produce a **design review**: alternative designs for each main journey,
grounded in the people who use the product and the agreed contract. The
designs are static mock-ups under `docs/analysis/`, compared in an analysis
that ends with the owner's decisions.

Default to three designs per journey. Each design has a desktop (or iPad) frame
and a phone frame, unless the request says otherwise.

## 1. Ground the journeys

Read these before drawing anything:

- the epic or story, and its binding Accepted ADRs
- `docs/GLOSSARY.md`
- who the reader is: the Product Lead persona
  (`docs/backlog/personas/product-lead.md`), a DHCW Product Lead managing
  their products' public Now / Next / Later roadmaps, mostly on a desktop with
  the phone as a second device. The public site is a separate app; draw only
  this editor. State in
  the inventory which of the persona's assumptions each journey relies on.
  Keep connecting to Google out of the frames unless the journey is about it
- the existing screens each journey touches, in `src/features/`,
  `src/components/layout/` and `src/routes/`, for navigation, page layout and
  the components a design would reuse (`src/components/ui/`)

Done when you hold an **inventory**. Each journey in it has its reader, device,
place, owning story, and that story's acceptance scenarios. Group journeys that
share a screen into main journeys. List each excluded journey with its reason,
such as belonging to a deferred epic.

## 2. Fix the sample world

Write one sample-data sheet before drawing. It holds:

- today's date
- the cast: the invented Product Leads, roadmaps and roadmap items the screens
  show: each roadmap's name, and each item's horizon (Now, Next, Later), title,
  description, expected outcomes and tags, written as a real Product Lead
  would for the public and no longer than one phone-sized card
- every entity's state and dated history: when an item was added, moved or
  last published, which edits are pending, which roadmaps are stale (six weeks
  without publishing), when the feature started, and
  the connection state only where a journey shows it
- every derived value a screen shows, such as a count, a connection status or
  a "last refreshed" time that follows from the history

Keep the sheet in the scratchpad when one analysis uses it. When several
analyses share one world, such as an epic's journey groups delivered as
separate PRs, the first commits it beside them as
`docs/analysis/{epic}-ux-sample-world.md`. A later analysis only adds to it,
and every state, count and sentence already written stays true: a new entity
of a kind the sheet counts, such as a visible roadmap, is one it already counts
but leaves unnamed. Correct a wrong fact in the sheet and in every merged
analysis and page that shows it, in one PR, and name the correction to the
code-reviewer. A decided analysis and its page keep their text instead: add a
line naming the correction to the analysis's _Outcome_.

Every screen derives from this sheet, and the sheet states **now**, a time
today. A frame without a time shows the world at now. Set a frame of the user
taking a journey's action at now or a stated time today; the action's own
dates, such as an observation date, are whatever the journey enters. Unsaved
input changes no state or count, though the sheet may name it as not yet saved.
A frame showing the action just saved gives its time, before now, and the sheet
records that save as an event at that time. The recorded save, like any
addition to a shared sheet, leaves every state and count already stated true.
Take each weekday from a command, such as
`node -p "new Date('2026-10-28T12:00Z').toUTCString()"`, rather than from
memory. Done when every history event is dated before now, every derived value
and sentence agrees with the history it comes from, and each entity has exactly
one state at each stated moment, its state at now being the one every untimed
screen shows.

## 3. Decide what varies

Write down what every design shares: the contract's invariants, the
permissions, and the product's existing look. The comparison is then between
interaction models. For each main journey, choose designs that differ in their
model. These three usually separate cleanly:

- **inline**: the action sits on the existing screen
- **guided**: a focused flow, drawer or wizard
- **overview** or **mode**: a new place or state built for the task

Done when every main journey has its designs named, each with its model.

## 4. Draw

Draw each design as one fragment, using the classes in `assets/mock.css`.

- **Layout.** The fragment is a `.ab` artboard with two `.col` columns. Each
  column holds a `.lbl` label strip and then a frame: `.dev` for desktop or iPad
  in the first, `.ph` for the phone in the second. The phone is sized by `.ph`.
  For a page that scrolls, add `tall` to the `.ab` so both frames show it whole.
- **Styles.** `mock.css` mirrors the theme tokens in `src/styles/globals.css`
  (`:root` and `.dark`); update it when those tokens change. Add `dark` to an
  `.ab` to draw a dark-mode artboard. Put a design's own styles in a `<style>` block of
  plain rules inside the fragment. The assembler scopes them to that design and
  stops on an at-rule such as `@media`.
- **Copy.** Write mock-up copy in the product's voice from the copywriter skill,
  reusing strings from `src/i18n/locales/en.ts` where a screen already says
  the thing. It is draft, in English only; Welsh follows with the build. Rationale goes in the analysis, not on the
  mock-ups.
- **Elements.** Use real `<button>`, `<a>` and `<input>` elements with
  accessible names, even in static mock-ups. A choice card is a button with a
  `radio` or `checkbox` role and `aria-checked`. Every design shares one page,
  so prefix each `id` with its design.

When the runtime offers a design canvas artifact, publish the designs there for
the owner to comment on. Its `.dc.html` files work directly as fragments,
because the assembler reads the markup inside `<x-dc>`.

Done when every main journey has all its designs as fragments with both frames,
and every count drawn matches the rows drawn.

## 5. Trace the scenarios

For each design, trace every acceptance scenario of the stories it covers to
one of three outcomes:

- **shown**, naming the frame that shows it
- **departure**, recorded as a decision in the analysis
- **not yet drawn**, listed in the analysis

The details a shortcut tends to skip are:

- the loading, empty and error states, and the retry or reconnect action
- the expired-session path and what stays on screen through it
- a state the current screen already handles, such as a hidden worksheet
- the stored time of an event, such as when the data was last refreshed
- keyboard focus and the screen-reader name of each control

Also trace each read and write a design uses against the story that supplies
it, and each stored state a read returns (a hidden worksheet) against the story
that first writes it (an epic's delivery rules may name this). List a missing
one in _Decisions needed_, as an owner question raised with the designs, not
after the owner has chosen.

Done when no scenario, read or write is left untraced. Keep the trace in the
scratchpad.

## 6. Write the analysis

Write `docs/analysis/{topic}-ux-analysis.md` under the analysis rules in
`docs/AGENTS.md`. Put the page in a sibling folder:
`docs/analysis/{topic}-ux-analysis/prototypes.html`.

Use these sections, in this order:

1. A head giving the scope and the base SHA, saying that only static
   mock-ups and documents were added, and linking any shared sample sheet.
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

## 7. Assemble and check

1. Put the fragments in a folder.
2. Write a manifest JSON:
   `{"title", "intro", "journeys": [{"title", "brief", "designs": [{"title", "file"}]}]}`.
   Each `file` is relative to the manifest.
3. Run the assembler and the check. The check uses `@playwright/test` from the root `pnpm install` and a
   Chromium (`pnpm exec playwright install chromium`). Write its screenshots to
   the scratchpad.

```bash
node .agents/skills/ux-prototypes/scripts/assemble.mjs <manifest.json> docs/analysis/{topic}-ux-analysis/prototypes.html
node .agents/skills/ux-prototypes/scripts/check-page.mjs docs/analysis/{topic}-ux-analysis/prototypes.html <scratchpad>/shots
```

These checks run by hand, not in CI: they are a local aid for throwaway design
pages. `check-page.mjs` screenshots every design at 1440px wide. It fails when the
page scrolls sideways at 375px wide, an artboard's navigation has no native
links or buttons, a `.rad` or `.chk` mark sits outside a native control, or an
element id repeats.
It cannot see clipping inside a frame, so read the screenshots for that.

For system Chromium, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to its executable.
If the browser blocks file URLs, serve the page and pass its HTTP(S) URL instead
of a file path. Run the assembler and checker fixtures with the same browser
configuration:

```bash
node --test .agents/skills/ux-prototypes/scripts/*.test.mjs
```

Done when the check passes and every screenshot shows its frames unclipped.

## 8. Review and deliver

Deliver through the PR path in `.agents/skills/implement-story/SKILL.md`. Brief the reviewers per
`.agents/skills/implement-story/references/delegation.md`, giving each the
committed page and analysis plus:

- **`code-reviewer`**: the inventory, the scenario trace and the sample sheet.
  It checks each design against the contract and the stories, and checks that
  the sample data agrees across screens. For a shared sheet, it also checks
  that every state, count and sentence the sheet already held still holds or
  is a named correction, carried through as step 2 says.
- **`quality-reviewer`**: the analysis rules, the glossary and the copywriter
  voice.

## Delegation

Draw every design in the main agent. One author keeps the visual language and
the sample world coherent. Parallel drafting multiplies the cross-screen
inconsistencies that reviewers then have to catch.

Delegate in one case beyond the reviewers above. For a large epic, an
`Explore` worker can build step 1's inventory, keeping the stories out of the
main context.
