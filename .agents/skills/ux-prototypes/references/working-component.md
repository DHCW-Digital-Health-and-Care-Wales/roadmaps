# Working component

The **host** is the card, form, dialog or part of a page that holds the
control in the app, drawn at the widths the app gives it. Each design's host
sits on a **stage**, the app's page behind it. The owner tries every design on
one page, so the page is written by hand: one self-contained file of plain
HTML, CSS and JavaScript, with no framework and no network.

## Models

The models are ways of working the same value, such as a type-ahead box, a row
per entry and a tick list, or a menu, a handle to drag and a mode.

Each option of an open question about a rule is a switch on the page that
every design obeys, or a line of every design's readout.

The sample world is what the host shows, and whatever else the control reads.

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
  has. Keep the starter's styles for the app's controls and replace its host's.
- **Screens.** The Screen switch names screens and sets the host to the width
  the app draws it at on each. Give it a phone, a laptop and a monitor (375px,
  1024px and 1280px) and the screens where the control has least and most
  room, which fall either side of a layout breakpoint. Take each width from
  your captures of the app, or work it out from the page container's and the
  grid's classes.
- **Rules.** Write the rules every design shares once, as pure functions the
  designs call: what the value may hold, how typed text is cleaned, what Done
  keeps and Cancel leaves. The designs then differ only in how the control is
  worked. The same rules are the analysis's _What every design shares_.
- **Designs.** Each design draws the whole round trip: the host as it shows the
  value, the control opened, a change confirmed or cancelled, and the host
  showing the result. A redrawn control loses focus, so after each action put
  focus where the built control would. An interaction built by hand here, such
  as a drag, will not feel as the library a build would use does: say so in
  that design's Risks.
- **Readout.** Under each design, show what it keeps as the pending edit, and
  what publishing would write where that is in question. It exposes a rule the
  control hides.
- **Things to try.** Write one line per acceptance scenario, or per option of
  an open question, and per planted awkward case, in the Product Lead's words.
  End with the keyboard alone, the narrowest host and the dark theme.

Done when every design draws its round trip and has its readout, and the list
covers every scenario or option and every planted case.

## Check

The page check presses nothing. Drive the page yourself: work every thing to
try in every design by keyboard alone, at the narrowest host and in the dark
theme. A Playwright script that takes its browser from `launchChromium` in
`scripts/chromium.mjs` and fails on any `pageerror` repeats those tries at each
screen and theme; read a screenshot of each design it leaves, and of each menu
open at the narrowest host. Done when every
thing to try works in every design and the readout shows its result, or the
analysis lists the gap in that design's Risks or in _Not yet drawn_.
