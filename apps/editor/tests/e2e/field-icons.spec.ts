import { boxesOf, centre } from "./fixtures/layout"
import { itemOf, openProductA } from "./fixtures/moved-items"
import { expect, test } from "./fixtures/test"

/**
 * STY-079: the tag icon and the building-complex icon stand before "Tags" and
 * "Organisations", the label's colour and its text's height, centred on its line, never
 * apart from their word. Layout and colour, which jsdom does not draw.
 */

const DESKTOP = { width: 1280, height: 900 }

test("a card's icons stand level with their labels, as tall as the text, in its colour (S1, S10)", async ({
  page,
}) => {
  await openProductA(page, DESKTOP)
  const card = itemOf(page, "Example card with every column")

  for (const [label, icon] of [
    ["Tags", "lucide-tag"],
    ["Organisations", "lucide-building-complex"],
  ] as const) {
    const term = card.getByRole("term").filter({ hasText: label })
    const [labelBox, iconBox, wordBox] = await boxesOf(
      term,
      term.locator(`svg.${icon}`),
      term.getByText(label, { exact: true }),
    )
    // Before the word, with a small gap, level with its line.
    expect(iconBox.right).toBeLessThan(wordBox.x)
    expect(wordBox.x - iconBox.right).toBeLessThan(8)
    expect(Math.abs(centre(iconBox) - centre(wordBox))).toBeLessThan(2)
    // As tall as the text, and inside the label's own line.
    const fontSize = await term.evaluate((element) =>
      parseFloat(getComputedStyle(element).fontSize),
    )
    expect(Math.abs(iconBox.height - fontSize)).toBeLessThan(0.5)
    expect(iconBox.y).toBeGreaterThanOrEqual(labelBox.y - 1)
    expect(iconBox.bottom).toBeLessThanOrEqual(labelBox.bottom + 1)
    // The label's colour, whatever the theme.
    const colours = await term.evaluate((element) => {
      const svg = element.querySelector("svg")
      return [
        getComputedStyle(element).color,
        svg ? getComputedStyle(svg).color : null,
      ]
    })
    expect(colours[1]).toBe(colours[0])
  }
  // Only these two labels have one.
  await expect(card.getByRole("term").locator("svg")).toHaveCount(2)
})
