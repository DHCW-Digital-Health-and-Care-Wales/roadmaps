import { describe, expect, it } from "vitest"

import css from "./globals.css?raw"
import { readStylesheet } from "./testing/stylesheet"

/**
 * WCAG contrast of the semantic tokens, in both themes (ADR-010): every text pair 4.5:1
 * (1.4.3), every control boundary and focus indicator 3:1 (1.4.11). `--border` is
 * decorative and exempt. `--primary` is a fill, never text: text on it is
 * `--primary-foreground`, and links use `--link`. A new semantic token adds its pairs here.
 * Opacity-modified colours (`bg-destructive/10`) are not tokens, so they are out of reach
 * until token enforcement turns each tint into one.
 */

const TEXT_PAIRS: readonly (readonly [
  foreground: string,
  background: string,
])[] = [
  ["foreground", "background"],
  ["foreground", "muted"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["muted-foreground", "muted"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
  ["muted-foreground", "popover"],
  ["accent-foreground", "accent"],
  ["destructive", "background"],
  ["destructive", "card"],
  ["destructive", "muted"],
  ["link", "background"],
  ["link", "card"],
  ["link", "muted"],
  ["link-hover", "background"],
  ["link-hover", "card"],
  ["focus-foreground", "focus"],
  ["status-neutral-fg", "status-neutral-bg"],
  ["status-info-fg", "status-info-bg"],
  ["status-success-fg", "status-success-bg"],
  ["status-warning-fg", "status-warning-bg"],
  ["status-danger-fg", "status-danger-bg"],
  ["sidebar-foreground", "sidebar"],
  ["sidebar-primary-foreground", "sidebar-primary"],
  ["sidebar-accent-foreground", "sidebar-accent"],
]

/** Where controls and their focus indicators sit. */
const SURFACES = ["background", "card", "popover", "muted"] as const

/** What `focus-fill` replaces: the fills of buttons and button-styled links. */
const FILLS = ["primary", "secondary", "muted", "accent", "background"] as const

const TEXT_MINIMUM = 4.5
const NON_TEXT_MINIMUM = 3

const { declarations } = readStylesheet(css)

/** The literal each token resolves to in a theme; `.dark` overrides `:root`. */
function theme(...blocks: string[]): (token: string) => string {
  const values = new Map<string, string>()
  for (const block of blocks) {
    for (const d of declarations.filter((d) => d.block === block)) {
      values.set(d.name, d.value)
    }
  }
  return function resolve(token: string): string {
    const value = values.get(`--${token.replace(/^--/, "")}`)
    if (value === undefined) throw new Error(`--${token} is not declared`)
    const reference = /^var\(--([\w-]+)\)$/.exec(value)?.[1]
    return reference ? resolve(reference) : value
  }
}

const themes = {
  light: theme(":root"),
  dark: theme(":root", ".dark"),
}

function luminance(hex: string): number {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!match) throw new Error(`Not a #rrggbb colour: ${hex}`)
  const [r = 0, g = 0, b = 0] = match.slice(1).map((channel) => {
    const value = parseInt(channel, 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** The WCAG 2 contrast ratio of two `#rrggbb` colours. */
function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05)
}

describe("contrast", () => {
  it("measures WCAG ratios", () => {
    expect(contrast("#ffffff", "#000000")).toBeCloseTo(21)
    expect(contrast("#212b32", "#ffffff")).toBeCloseTo(14.42, 1)
  })

  describe.each(Object.entries(themes))("%s theme", (_, resolve) => {
    const ratio = (a: string, b: string) => contrast(resolve(a), resolve(b))

    it.each(TEXT_PAIRS)("text %s on %s is at least 4.5:1", (fg, bg) => {
      expect(ratio(fg, bg)).toBeGreaterThanOrEqual(TEXT_MINIMUM)
    })

    it.each(SURFACES)(
      "a control boundary (--input) on %s is at least 3:1",
      (surface) => {
        expect(ratio("input", surface)).toBeGreaterThanOrEqual(NON_TEXT_MINIMUM)
      },
    )

    // The indicator is two colours, yellow and dark. Whichever meets the surface carries
    // it: the dark bar or ring on light surfaces, the yellow on navy.
    it.each(SURFACES)(
      "the focus indicator on %s is at least 3:1",
      (surface) => {
        const best = Math.max(
          ratio("focus", surface),
          ratio("focus-foreground", surface),
        )
        expect(best).toBeGreaterThanOrEqual(NON_TEXT_MINIMUM)
      },
    )

    // Focus must change the control visibly, not by hue alone: its fill turns yellow at
    // 3:1 from what it was, or the dark bar under it shows against the page.
    it.each(FILLS)(
      "focusing a %s control changes it by at least 3:1",
      (fill) => {
        const change = Math.max(
          ratio("focus", fill),
          ratio("focus-foreground", "background"),
        )
        expect(change).toBeGreaterThanOrEqual(NON_TEXT_MINIMUM)
      },
    )

    it("keeps the focus indicator's two parts 3:1 apart", () => {
      expect(ratio("focus", "focus-foreground")).toBeGreaterThanOrEqual(
        NON_TEXT_MINIMUM,
      )
    })
  })
})
