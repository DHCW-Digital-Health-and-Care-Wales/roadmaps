# Frames

Each design is one fragment of static mock-up. An assembler builds the
fragments into the review page.

## Models

For a journey, these three usually separate cleanly:

- **inline**: the action sits on the existing screen
- **guided**: a focused flow, drawer or wizard
- **overview** or **mode**: a new place or state built for the task

Each option of an open question that decides no design is a moment of every
design it bears on.

## Draw

Draw each design as one fragment, using the classes in `assets/mock.css`.

`mock.css` follows the app's tokens by itself, but its shell and controls are
drawn by hand, so they fall behind when the app's header, navigation or a
control changes. Draw the screen as it is today first, assemble it alone, and
compare its screenshot with your captures. Where they differ, correct
`mock.css` in this PR, and the same control in `assets/component-page.html`,
then run the skill's script tests. Every later prototype then starts from the
app as it is; a design's own styles hold only what the design adds.

- **Layout.** An `.ab` artboard holds two `.col` columns. Each column holds a
  `.lbl` label strip and then a frame: `.dev` for the desktop in the first,
  `.ph` for the phone in the second, unless the request says otherwise. A
  frame shows the part of a page in view, with where it is scrolled to in its
  `.lbl`; add `tall` to the `.ab` to show a page whole.
- **Moments.** Both frames of an artboard show the same moment, named by state
  in their `.lbl`. A design with several moments, such as confirming, just
  done and refused, stacks one artboard for each in its fragment.
- **Focus.** Draw a frame as someone using a pointer sees it, and say where
  keyboard focus lands in its `.lbl`. The app's focus is a yellow fill that
  replaces a button's own colour, so a destructive button drawn with `.focus`
  no longer shows red. Draw `.focus` on a button only where keyboard focus is
  the journey's question.
- **Styles.** `mock.css` draws the app's look: its shell (`.hdr`, `.phase`,
  `.pg`), item cards, buttons, fields, tags, alerts, dialogs and menus, each
  named in its comments. The assembler sets the app's theme tokens on every
  artboard, so name a token and never a colour. Add `dark` to an `.ab` to draw
  it in the dark theme. Styles every design shares go in one stylesheet, named
  as the manifest's `css`, and a design's own in a `<style>` block inside its
  fragment. Both hold plain rules: the assembler scopes them to the designs,
  stops on an at-rule such as `@media`, and drops a rule for `body`, `html` or
  `:root`.

When the runtime offers a design canvas artifact, publish the designs there as
well, for the owner to comment on; the committed page stays the record. Its
`.dc.html` files work directly as fragments, because the assembler reads the
markup inside `<x-dc>`.

Fragments that share a screen are best written by one script, so the sample
world cannot drift between them.

Done when every design is a fragment with both frames for each of its moments.

## Assemble

1. Keep the fragments, any shared stylesheet and the manifest in one scratchpad
   folder: only the assembled page is committed.
2. Write the manifest JSON:
   `{"title", "intro", "css", "journeys": [{"title", "brief", "designs": [{"title", "file"}]}]}`.
   `css` is optional; it and each `file` are relative to the manifest.
3. Run the assembler:

```bash
node .agents/skills/ux-prototypes/scripts/assemble.mjs <manifest.json> docs/analysis/{topic}-ux-analysis/{topic}-ux-prototypes.html
```

## Check

The page check sees neither clipping nor a wrong fact. Read every screenshot
for:

- nothing cut off sideways or by another element, and nothing drawn scrolled
  under a header that does not stay in place in the app; a page running past a
  frame's foot is the edge of the view, so long as what the moment is about is
  in it
- every count against the rows drawn, in both frames
- every state a frame names, such as its pending edits, against what its dialog
  or notice says of it
- the shell and its controls against your captures of the app

Done when every screenshot has been read for all four.
