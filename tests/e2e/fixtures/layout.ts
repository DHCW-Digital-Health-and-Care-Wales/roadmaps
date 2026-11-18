import type { Locator, Page } from "@playwright/test"

/** Where a box sits in the viewport, with its right and bottom edges. */
export interface Box {
  x: number
  y: number
  width: number
  height: number
  right: number
  bottom: number
}

/** `locator`'s box in the viewport, failing when it has none. */
export async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox()
  if (!box) throw new Error("Not laid out")
  return { ...box, right: box.x + box.width, bottom: box.y + box.height }
}

/** Whether the page scrolls sideways. */
export function scrollsSideways(page: Page): Promise<boolean> {
  return page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  )
}

/**
 * The right edge of a roadmap's page content, where a control may run to: the page
 * container's right edge less its padding.
 */
export function contentRight(page: Page): Promise<number> {
  return page
    .getByRole("main")
    .getByRole("heading", { level: 1 })
    .evaluate((title) => {
      const content = title.closest("[data-slot=page-container]")
      if (!content) throw new Error("No page container")
      const style = getComputedStyle(content)
      return (
        content.getBoundingClientRect().right -
        Number.parseFloat(style.paddingRight)
      )
    })
}
