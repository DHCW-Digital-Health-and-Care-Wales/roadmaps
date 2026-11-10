import { createCn } from "cn/config"

/** The type tokens `globals.css` defines (`text-heading-xl`, …), held in step by a test. */
export const TEXT_TOKENS = [
  "heading-xl",
  "heading-l",
  "heading-m",
  "heading-s",
  "heading-xs",
  "body",
  "body-xs",
] as const

/** The semantic shadows `globals.css` defines (`shadow-control`, `shadow-popup`, …). */
export const SHADOW_TOKENS = [
  "control",
  "control-edge",
  "card-bar",
  "popup",
] as const

/** DHCW's focus indicators, the `@utility` blocks in `globals.css`. */
export const FOCUS_UTILITIES = [
  "focus-fill",
  "focus-ring",
  "focus-link",
] as const

/**
 * Joins class names and resolves Tailwind conflicts, the last class winning. Configured
 * with our theme's names: out of the box `text-body` reads as a colour, so
 * `cn("text-body", "text-muted-foreground")` would drop the size. Import `cn` from here,
 * never from the `cn` package.
 */
export const cn = createCn<"focus">({
  extend: {
    theme: { text: [...TEXT_TOKENS], shadow: [...SHADOW_TOKENS] },
    classGroups: { focus: [...FOCUS_UTILITIES] },
  },
})
