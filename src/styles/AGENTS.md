# src/styles — design tokens

`globals.css` holds the app's whole theme: DHCW's design system ported as tokens, never
loaded (ADR-010). Its header comment names the three tiers; `tokens.test.ts` and
`contrast.test.ts` hold them.

- Use a `--nhsw-*` or `--app-dark-*` primitive only inside `globals.css`; everything else
  uses semantic tokens and the utilities the theme generates from them.
- Copy a new `--nhsw-*` value from the pinned release (`node_modules/dhcw-design-system`)
  into the `@source` group of its file, with its reference as the trailing comment: the
  Sass variable (`$nhswales-link-colour`) or the block and property (`&--grey color`,
  `@mixin nhsw-button-base border-radius`). The drift test reads the value from there.
- Give a new semantic token a `var()` of a primitive, in `:root` and, where it differs,
  `.dark`, and add its text (4.5:1) or control and focus (3:1) pairs to
  `contrast.test.ts`. Add an `--app-dark-*` primitive only when no DHCW colour passes on
  navy.
- Apply a focus utility through a state variant (`focus-visible:focus-fill`,
  `has-focus-visible:focus-ring`): it is the style alone. A `dark:` or `aria-*:`
  background on the same element sorts after it and hides the fill, so a focusable
  component carries none.
- A new type, shadow or focus name also goes in `@/lib/utils`, so `cn` merges it as a size
  rather than a colour.

## Upgrading the DHCW pin

1. `pnpm add -D "dhcw-design-system@github:DHCW-Digital-Health-and-Care-Wales/dhcw-design-system#v<x.y.z>"`,
   an exact tag (DHCW is not on the npm registry).
2. `pnpm exec vitest run src/styles`. Each failing primitive names its new value, or a
   reference DHCW moved: update the value, or the `@source` and reference.
3. Compare the two tags' `src/tokens/`, `src/foundations/`, `src/utilities/` and
   `src/components/content/_tag.scss` on GitHub for values the app does not copy yet, and
   copy those it should.
4. Re-run the contrast test: a changed DHCW colour can break a dark pair, which an
   `--app-dark-*` value then fixes.
5. Update the version in the README's Design section, and publish before/after
   screenshots if the look changed.
