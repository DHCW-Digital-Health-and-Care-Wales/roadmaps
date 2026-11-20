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

/**
 * The boxes of `locators` in the viewport, all read in one step. Read one at a time, they
 * are of different moments: the page may be scrolling to an item that was just moved.
 */
export async function boxesOf<Locators extends Locator[]>(
  ...locators: Locators
): Promise<{ [At in keyof Locators]: Box }> {
  const first = locators[0]
  if (!first) return [] as unknown as { [At in keyof Locators]: Box }
  const handles = await Promise.all(
    locators.map((locator) => locator.elementHandle()),
  )
  try {
    const boxes = await first.page().evaluate(
      (elements) =>
        elements.map((element) => {
          const { x, y, width, height, right, bottom } =
            element.getBoundingClientRect()
          return { x, y, width, height, right, bottom }
        }),
      handles,
    )
    // One box for each locator, in order.
    return boxes as unknown as { [At in keyof Locators]: Box }
  } finally {
    await Promise.all(handles.map((handle) => handle.dispose()))
  }
}

/**
 * Resolves once every animation on the page that ends has ended. A dialog is ready as
 * focus reaches its first field, before it has slid or zoomed in: reduced motion cuts
 * that to 0.01 ms, but the first keyframe still holds until the next frame, which a
 * loaded runner delays (DEF-025). Animations that never end, a spinner's, are left.
 */
export async function animationsDone(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const running = () =>
      document
        .getAnimations()
        .filter(
          (animation) =>
            animation.playState === "running" &&
            Number.isFinite(
              Number(animation.effect?.getComputedTiming().endTime),
            ),
        )
    for (let ending = running(); ending.length > 0; ending = running()) {
      await Promise.allSettled(ending.map((animation) => animation.finished))
    }
  })
}

/**
 * The boxes of `locators` in the viewport, all read in one step once the page's
 * animations have ended (`animationsDone`). Read a popup's geometry with this, a
 * dialog's, a drawer's or a menu's, and `boxesOf` for what does not animate in.
 */
export async function settledBoxes<Locators extends Locator[]>(
  ...locators: Locators
): Promise<{ [At in keyof Locators]: Box }> {
  const first = locators[0]
  if (first) await animationsDone(first.page())
  return boxesOf(...locators)
}

/** The middle of `box`, down the viewport. */
export const centre = (box: Box): number => box.y + box.height / 2

/**
 * Whether `box` is level with `other` (centres within 4px), or `other` is wholly under
 * it: where a row of controls wraps, `box` the tags and `other` the buttons that follow.
 */
export function levelWithOrUnder(box: Box, other: Box): boolean {
  return Math.abs(centre(box) - centre(other)) < 4 || other.y >= box.bottom
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
