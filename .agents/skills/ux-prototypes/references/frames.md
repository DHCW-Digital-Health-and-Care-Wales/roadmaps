# Frames

Each design is one fragment of static mock-up: a desktop frame and a phone
frame, unless the request says otherwise. An assembler builds the fragments
into the review page.

## Draw

Draw each design as one fragment, using the classes in `assets/mock.css`.

- **Layout.** The fragment is a `.ab` artboard with two `.col` columns. Each
  column holds a `.lbl` label strip and then a frame: `.dev` for the desktop in
  the first, `.ph` for the phone in the second. The phone is sized by `.ph`.
  For a page that scrolls, add `tall` to the `.ab` so both frames show it whole.
- **Styles.** `mock.css` mirrors the theme tokens in `src/styles/globals.css`
  (`:root` and `.dark`); update it when those tokens change. Add `dark` to an
  `.ab` to draw a dark-mode artboard. Put a design's own styles in a `<style>`
  block of plain rules inside the fragment. The assembler scopes them to that
  design and stops on an at-rule such as `@media`.

When the runtime offers a design canvas artifact, publish the designs there for
the owner to comment on. Its `.dc.html` files work directly as fragments,
because the assembler reads the markup inside `<x-dc>`.

Done when every design is a fragment with both frames.

## Assemble

1. Put the fragments in a folder.
2. Write a manifest JSON:
   `{"title", "intro", "journeys": [{"title", "brief", "designs": [{"title", "file"}]}]}`.
   Each `file` is relative to the manifest.
3. Run the assembler:

```bash
node .agents/skills/ux-prototypes/scripts/assemble.mjs <manifest.json> docs/analysis/{topic}-ux-analysis/prototypes.html
```

## Check

The page check cannot see clipping inside a frame, so read its screenshots for
that. Done when every screenshot shows its frames unclipped.
