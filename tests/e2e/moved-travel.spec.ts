import type { Locator, Page } from "@playwright/test"

import { openEditItemDialog, publishOnce } from "./fixtures/dialogs"
import { withTabItems } from "./fixtures/fake-sheets"
import { boxesOf } from "./fixtures/layout"
import { tokenColour } from "./fixtures/look"
import {
  chooseCompact,
  chooseFromMenu,
  inRoom,
  itemOf,
  main,
  moveButton,
  openProductA,
} from "./fixtures/moved-items"
import { expect, test } from "./fixtures/test"

/**
 * STY-072: after a choice in the Move menu, the item travels from where it was to where
 * it lands, as a view transition, then shows its mark. Positions in flight are not
 * asserted: each transition the page starts is recorded as it runs (its types, each
 * item's group, the scroll), and the page as it lands. Only an item with an ID travels,
 * so each test publishes once first, which gives every item one ("Minimal card" is "A
 * minimal card" from then on).
 */

const DESKTOP = { width: 1280, height: 812 }

/** One view transition the page started, as `recordTravels` saw it. */
interface Travel {
  types: string[]
  /** Each group's name, its duration in ms and its z-index, as the travel began. */
  groups: { name: string; duration: number; zIndex: string }[]
  scrollAtReady: number
  /** Whether a menu showed as the travel began. */
  menuShown: boolean
  scrollAtEnd: number | null
  /** When it ended, whether it ran out or was skipped; `null` while it runs. */
  endedAt: number | null
  readyAt: number | null
}

/**
 * Records each view transition the page starts in `window.__travels`, leaving the
 * browser's own to run it; with `withoutApi`, the page is a browser with none.
 */
async function recordTravels(page: Page, { withoutApi = false } = {}) {
  await page.addInitScript((without) => {
    const travels: Travel[] = []
    Object.assign(window, { __travels: travels })
    if (without) {
      // @ts-expect-error -- a browser without view transitions
      delete Document.prototype.startViewTransition
      return
    }
    const start = document.startViewTransition.bind(document)
    document.startViewTransition = (arg) => {
      const transition = start(arg)
      const travel: Travel = {
        types: [...transition.types],
        groups: [],
        scrollAtReady: 0,
        menuShown: false,
        scrollAtEnd: null,
        endedAt: null,
        readyAt: null,
      }
      travels.push(travel)
      transition.ready.then(
        () => {
          travel.readyAt = performance.now()
          travel.scrollAtReady = window.scrollY
          travel.menuShown = [
            ...document.querySelectorAll('[role="menu"]'),
          ].some((menu) => menu.checkVisibility())
          for (const animation of document.getAnimations()) {
            const effect = animation.effect as KeyframeEffect | null
            const name = /^::view-transition-group\((.+)\)$/.exec(
              effect?.pseudoElement ?? "",
            )?.[1]
            if (!name || !effect) continue
            travel.groups.push({
              name,
              duration: Number(effect.getComputedTiming().duration),
              zIndex: getComputedStyle(
                document.documentElement,
                `::view-transition-group(${name})`,
              ).zIndex,
            })
          }
        },
        () => undefined,
      )
      void transition.finished.then(() => {
        travel.endedAt = performance.now()
        travel.scrollAtEnd = window.scrollY
      })
      return transition
    }
  }, withoutApi)
}

const travels = (page: Page) =>
  page.evaluate(() => (window as unknown as { __travels: Travel[] }).__travels)

/** The view transition name the card or row of the item titled `title` has. */
const nameOf = (page: Page, title: string) =>
  itemOf(page, title).evaluate(
    (element) => getComputedStyle(element).viewTransitionName,
  )

async function open(page: Page) {
  await openProductA(page, DESKTOP)
  await publishOnce(page)
}

/** The item's place in the page, unmoved by the page's scroll. */
const placeOf = (item: Locator) =>
  item.evaluate((element) => {
    const box = element.getBoundingClientRect()
    return { x: box.x, y: box.y + window.scrollY }
  })

/** Waits for every transition started to end, and for nothing to travel. */
async function landed(page: Page) {
  await expect
    .poll(async () => (await travels(page)).every((t) => t.endedAt !== null))
    .toBe(true)
  expect(
    await page.evaluate(() => document.activeViewTransition === null),
  ).toBe(true)
}

test.describe("a move within a placement travels (S1)", () => {
  test.use({ reducedMotion: "no-preference" })

  for (const view of ["cards", "compact"] as const) {
    for (const [choice, moved, passed, mark] of [
      ["Up one", "Card awaiting release", "A minimal card", "Moved up"],
      [
        "To the top",
        "Card awaiting release",
        "Example card with every column",
        "Moved to the top",
      ],
      [
        "Down one",
        "Example card with every column",
        "A minimal card",
        "Moved down",
      ],
      [
        "To the bottom",
        "Example card with every column",
        "Card awaiting release",
        "Moved to the bottom",
      ],
    ] as const) {
      test(`“${choice}” in ${view}: raised, in about 0.4 seconds, the items it passes moving too, then marked, focus on its Move`, async ({
        page,
      }) => {
        await recordTravels(page)
        await open(page)
        if (view === "compact") await chooseCompact(page)
        const [movedName, passedName] = await Promise.all([
          nameOf(page, moved),
          nameOf(page, passed),
        ])
        expect(movedName).toMatch(/^item-/)
        const passedFrom = await placeOf(itemOf(page, passed))

        await chooseFromMenu(page, moved, choice)
        await landed(page)

        const [travel, ...more] = await travels(page)
        expect(more).toEqual([])
        expect(travel?.types).toEqual(["item-move"])
        // The menu it was chosen from went as it began.
        expect(travel?.menuShown).toBe(false)
        const group = (name: string) =>
          travel?.groups.find((each) => each.name === name)
        expect(group(movedName)).toMatchObject({ duration: 400, zIndex: "1" })
        expect(group(passedName)).toMatchObject({ duration: 400 })
        expect(group(passedName)?.zIndex).not.toBe("1")
        expect(await placeOf(itemOf(page, passed))).not.toEqual(passedFrom)
        await expect(
          itemOf(page, moved).getByText(mark, { exact: true }),
        ).toBeAttached()
        await expect(moveButton(page, moved)).toBeFocused()
        // Opaque, as a card is, so it hides the items it passes as it travels.
        expect(
          await itemOf(page, moved).evaluate(
            (element) => getComputedStyle(element).backgroundColor,
          ),
        ).toBe(await tokenColour(page, "--card"))
      })
    }
  }
})

test.describe("a long placement (S1, STY-071 S4)", () => {
  test.use({ reducedMotion: "no-preference" })

  for (const view of ["cards", "compact"] as const) {
    for (const by of ["pointer", "keyboard"] as const) {
      test(`“To the top” from far down, in ${view}, chosen by ${by}: it travels and lands in the room between the bars, focus on its Move`, async ({
        page,
        sheets,
      }) => {
        sheets.spreadsheet = withTabItems(
          "ProductA",
          ["Minimal card", "Next"],
          ...Array.from({ length: 20 }, (_, at): [string, string] => [
            `Now item ${String(at + 1)}`,
            "Now",
          ]),
        )
        await recordTravels(page)
        await open(page)
        if (view === "compact") await chooseCompact(page)
        const last = itemOf(page, "Now item 20")

        if (by === "pointer") {
          await chooseFromMenu(page, "Now item 20", "To the top")
        } else {
          await moveButton(page, "Now item 20").focus()
          await page.keyboard.press("Enter")
          await page
            .getByRole("menuitem", { name: "To the top", exact: true })
            .focus()
          await page.keyboard.press("Enter")
        }
        await landed(page)

        expect((await travels(page)).map((each) => each.types)).toEqual([
          ["item-move"],
        ])
        await expect(last.getByText("Moved to the top")).toBeAttached()
        await expect.poll(() => inRoom(last)).toBe(true)
        await expect(moveButton(page, "Now item 20")).toBeFocused()
      })
    }
  }
})

test.describe("a move to another placement travels the whole way (S2)", () => {
  test.use({ reducedMotion: "no-preference" })

  test("to Later, below the screen: the page scrolls as it travels, in about 0.7 seconds; it lands last there, marked, in the room between the bars", async ({
    page,
  }) => {
    await recordTravels(page)
    await open(page)
    await page.evaluate(() => {
      window.scrollTo(0, 0)
    })
    const later = main(page).getByRole("list", { name: "Later", exact: true })
    expect(await inRoom(later)).toBe(false)
    const name = await nameOf(page, "A minimal card")

    await chooseFromMenu(page, "A minimal card", "Later")
    await landed(page)

    const [travel] = await travels(page)
    expect(travel?.types).toEqual(["item-move-across"])
    expect(travel?.groups.find((each) => each.name === name)).toMatchObject({
      duration: 700,
      zIndex: "1",
    })
    // The page went on scrolling while the item travelled.
    expect(travel?.scrollAtEnd).toBeGreaterThan(travel?.scrollAtReady ?? 0)
    const card = itemOf(page, "A minimal card")
    await expect(later.getByRole("listitem").last()).toContainText(
      "A minimal card",
    )
    await expect(card.getByText("Moved from Now")).toBeVisible()
    await expect.poll(() => inRoom(card)).toBe(true)
    await expect(moveButton(page, "A minimal card")).toBeFocused()
    // It ends with its tags together at its foot (STY-075 S1), as it lands.
    const [moved, changed] = await boxesOf(
      card.getByText("Moved from Now"),
      card.getByText("Changed", { exact: true }),
    )
    expect(Math.abs(moved.y - changed.y)).toBeLessThan(1)
    expect(moved.right).toBeLessThan(changed.x)
  })
})

/** Holds every travel in flight, so what follows surely happens while it travels. */
async function holdInFlight(page: Page, count: number) {
  await expect
    .poll(async () => (await travels(page))[count - 1]?.readyAt ?? null)
    .not.toBeNull()
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) {
      const effect = animation.effect as KeyframeEffect | null
      if (effect?.pseudoElement?.startsWith("::view-transition"))
        animation.pause()
    }
  })
  expect((await travels(page))[count - 1]?.endedAt).toBeNull()
}

test.describe("a second move takes over (S3)", () => {
  test.use({ reducedMotion: "no-preference" })

  test("a move from the keyboard while an item travels ends that travel at once, where it lands, and plays from there", async ({
    page,
  }) => {
    await recordTravels(page)
    await open(page)

    await chooseFromMenu(page, "Card awaiting release", "Up one")
    await holdInFlight(page, 1)
    // Focus is on its Move, which opens and chooses as it travels.
    const move = moveButton(page, "Card awaiting release")
    await expect(move).toBeFocused()
    await page.keyboard.press("Enter")
    const choice = page.getByRole("menuitem", { name: "Up one", exact: true })
    await choice.focus()
    await page.keyboard.press("Enter")
    await landed(page)

    const [first, second, ...more] = await travels(page)
    expect(more).toEqual([])
    // The first ended, skipped, as the second began.
    expect(first?.endedAt).toBeLessThanOrEqual(second?.readyAt ?? 0)
    expect(second?.types).toEqual(["item-move"])
    await expect(
      main(page)
        .getByRole("list", { name: "Now", exact: true })
        .getByRole("heading", { level: 3 }),
    ).toHaveText([
      "Card awaiting release",
      "Example card with every column",
      "A minimal card",
    ])
    await expect(
      itemOf(page, "Card awaiting release").getByText("Moved up", {
        exact: true,
      }),
    ).toBeVisible()
    await expect(main(page).getByText(/^Moved [^.]+$/)).toHaveCount(1)
    await expect(move).toBeFocused()
  })

  test("no control is held: the bars take a click as an item travels, and a press between the bars ends the travel, so the next reaches the page", async ({
    page,
  }) => {
    await recordTravels(page)
    await open(page)

    await chooseFromMenu(page, "Card awaiting release", "Up one")
    await holdInFlight(page, 1)
    const publish = main(page).getByRole("button", { name: "Publish changes" })
    expect(
      await publish.evaluate((element) => {
        const box = element.getBoundingClientRect()
        return element.contains(
          document.elementFromPoint(
            box.x + box.width / 2,
            box.y + box.height / 2,
          ),
        )
      }),
    ).toBe(true)

    // Mid-screen, in the room between the bars, where the items travel.
    await page.mouse.click(DESKTOP.width / 2, DESKTOP.height / 2)
    await expect
      .poll(async () => (await travels(page))[0]?.endedAt ?? null)
      .not.toBeNull()
    await chooseFromMenu(page, "A minimal card", "Up one")
    await landed(page)

    expect((await travels(page)).map((each) => each.types)).toEqual([
      ["item-move"],
      ["item-move"],
    ])
    await expect(
      itemOf(page, "A minimal card").getByText("Moved up", { exact: true }),
    ).toBeVisible()
  })
})

test.describe("no travel where none is wanted (S4)", () => {
  test("where the system asks for reduced motion, the move shows at once, marked", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await recordTravels(page)
    await open(page)

    await chooseFromMenu(page, "A minimal card", "Later")

    const card = itemOf(page, "A minimal card")
    await expect(card.getByText("Moved from Now")).toBeVisible()
    await expect.poll(() => inRoom(card)).toBe(true)
    expect(await travels(page)).toEqual([])
  })

  test.describe(() => {
    test.use({ reducedMotion: "no-preference" })

    test("in a browser without view transitions, the move shows at once, marked", async ({
      page,
    }) => {
      await recordTravels(page, { withoutApi: true })
      await open(page)

      await chooseFromMenu(page, "Card awaiting release", "Up one")

      await expect(
        itemOf(page, "Card awaiting release").getByText("Moved up", {
          exact: true,
        }),
      ).toBeVisible()
      await expect(moveButton(page, "Card awaiting release")).toBeFocused()
    })

    test("a move by the item dialog marks the item and does not travel", async ({
      page,
    }) => {
      await recordTravels(page)
      await open(page)

      const form = await openEditItemDialog(page, "A minimal card")
      await form
        .getByRole("combobox", { name: "Horizon or section" })
        .selectOption("Later")
      await form.getByRole("button", { name: "Done" }).click()
      await expect(form).toBeHidden()

      await expect(
        itemOf(page, "A minimal card").getByText("Moved from Now"),
      ).toBeVisible()
      expect(await travels(page)).toEqual([])
    })
  })
})

test.describe("nothing else travels (S5)", () => {
  test.use({ reducedMotion: "no-preference" })

  test("editing an item, switching view, opening a row and publishing start no transition", async ({
    page,
  }) => {
    await recordTravels(page)
    await open(page)

    const form = await openEditItemDialog(page, "A minimal card")
    await form.getByRole("textbox", { name: "Title" }).fill("A smaller card")
    await form.getByRole("button", { name: "Done" }).click()
    await expect(form).toBeHidden()
    await chooseCompact(page)
    await main(page)
      .getByRole("button", { name: "Show the rest of A smaller card" })
      .click()
    await main(page).getByRole("button", { name: "Publish changes" }).click()
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Publish changes" })
      .click()
    await expect(main(page).getByText(/^Changes published\./)).toBeVisible()

    expect(await travels(page)).toEqual([])
  })
})
