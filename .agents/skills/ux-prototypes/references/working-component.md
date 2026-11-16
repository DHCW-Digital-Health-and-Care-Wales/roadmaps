# Working component

Each design is the control itself, working, inside its **host**: the card, form
or dialog that holds it in the app, at the widths the app gives it. The owner
tries every design on one page, so the page is written by hand: one
self-contained file of plain HTML, CSS and JavaScript, with no framework and no
network.

## Start the page

```bash
node .agents/skills/ux-prototypes/scripts/component-page.mjs docs/analysis/{topic}-ux-analysis/prototypes.html
```

This writes the starter page, with the app's theme tokens copied from
`src/styles/globals.css` onto every `.stage` under their own names, light and
dark. Style the host and the designs with those tokens alone, as the app's
components do, so a design looks as it will when built.

The starter holds one of each part the page needs; keep them all:

- the **Theme** and **Screen** switches, which act on every stage
- **Things to try in each**, the list the owner works through
- **The sample**, the world the designs start from
- a figure per design: its name, **Start again**, its idea in a sentence or
  two, the stage with the host in it, and a **readout**

## Draw

- **Host.** Draw the host from the component in `src/features/` that holds the
  control, with enough of its other content to show how much room the control
  has. The Screen switch names screens and sets the host to the width the app
  draws it at on each. Give it the persona's screens (a 375px phone, a 1024px
  laptop, a 1280px monitor) and the screens where the host is narrowest and
  widest, which fall either side of a layout breakpoint. Measure each width in
  the running app.
- **Rules.** Write the rules every design shares once, as pure functions the
  designs call: what the value may hold, how typed text is cleaned, what Done
  keeps and Cancel leaves. The designs then differ only in how the control is
  worked. The same rules are the analysis's _What every design shares_.
- **Designs.** Each design draws the whole round trip: the host as it shows the
  value, the control opened, a change confirmed or cancelled, and the host
  showing the result. A redrawn control loses focus, so after each action put
  focus where the built control would.
- **Readout.** Under each design, show what it keeps as the pending edit, or
  what publishing would write. It exposes a rule the control hides.
- **Things to try.** Write one line per acceptance scenario and per planted
  awkward case, in the Product Lead's words. End with the keyboard alone, the
  narrowest host and the dark theme.

Done when every design draws its round trip and has its readout, and the list
covers every scenario and planted case.

## Check

The page check screenshots each design as it opens and presses nothing. Drive
the page yourself, with the `playwright-cli` skill or by hand: work every thing
to try in every design by keyboard alone, at the narrowest host and in the
dark theme. Done when every thing to try works in every design and the readout
shows its result, or the analysis lists the gap in that design's Risks or in
_Not yet drawn_.
