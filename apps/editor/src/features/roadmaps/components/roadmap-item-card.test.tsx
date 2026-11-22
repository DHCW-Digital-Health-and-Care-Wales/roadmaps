import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import type { Language } from "@/i18n"
import { renderWithI18n } from "@/test/render-with-i18n"

import { RoadmapItemCard } from "./roadmap-item-card"

const LINE = 20

/**
 * jsdom lays nothing out, so a field's lines are given: the element's `scrollHeight` is
 * `linesOf` its text, in lines of 20px (the real fit at 375px and 1280px is the E2E
 * specs', `tests/e2e/roadmap-items-cut.spec.ts`).
 */
function drawLines(linesOf: (text: string) => number) {
  const computed = window.getComputedStyle.bind(window)
  vi.spyOn(window, "getComputedStyle").mockImplementation((element) =>
    Object.defineProperty(computed(element), "lineHeight", {
      value: `${String(LINE)}px`,
    }),
  )
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(
    function (this: HTMLElement) {
      // A detail's own text, or the whole of a field's.
      return linesOf(this.textContent) * LINE
    },
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

const LONG = "A long text"
const SHORT = "A short text"

function renderCard(
  props: Parameters<typeof createTestRoadmapItem>[1] = {},
  language: Language = "en",
  title = "First item",
) {
  return renderWithI18n(
    <ul>
      <RoadmapItemCard
        item={createTestRoadmapItem(title, props)}
        organisations={[]}
      />
    </ul>,
    { language },
  )
}

function showMore(name: string | RegExp) {
  return screen.getByRole("button", { name })
}

describe("a card's long fields", () => {
  beforeEach(() => {
    drawLines((text) => (text.startsWith(LONG) ? 5 : 1))
  })

  it("cuts a description past three lines, with a Show more named for its field and item (S1, S6)", () => {
    renderCard({ description: { en: LONG, cy: "" } })

    const control = showMore("Show more of the description of First item")
    expect(control).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByText(LONG)).toHaveClass("line-clamp-3")
  })

  it("shows the rest in place and cuts it again, focus staying on the control (S4)", async () => {
    const user = userEvent.setup()
    renderCard({ description: { en: LONG, cy: "" } })

    await user.click(showMore(/^Show more/))
    const less = showMore("Show less of the description of First item")
    expect(less).toHaveAttribute("aria-expanded", "true")
    expect(less).toHaveFocus()
    expect(screen.getByText(LONG)).not.toHaveClass("line-clamp-3")

    await user.click(less)
    expect(showMore(/^Show more/)).toHaveFocus()
    expect(screen.getByText(LONG)).toHaveClass("line-clamp-3")
  })

  it("cuts each long field apart from the others (S2, S6)", async () => {
    const user = userEvent.setup()
    renderCard({
      description: { en: LONG, cy: "" },
      expectedOutcome: { en: `${LONG} outcome`, cy: "" },
      phase: { en: SHORT, cy: "" },
    })

    const description = showMore("Show more of the description of First item")
    const outcome = showMore("Show more of the expected outcome of First item")
    await user.click(outcome)
    expect(outcome).toHaveAccessibleName(
      "Show less of the expected outcome of First item",
    )
    expect(description).toHaveAccessibleName(
      "Show more of the description of First item",
    )
    expect(screen.getByText(`${LONG} outcome`)).not.toHaveClass("line-clamp-3")
    expect(screen.getByText(LONG)).toHaveClass("line-clamp-3")
    expect(screen.getAllByRole("button")).toHaveLength(2)
  })

  it("names two items' controls apart (S6)", () => {
    renderWithI18n(
      <ul>
        {["First item", "Second item"].map((title) => (
          <RoadmapItemCard
            key={title}
            item={createTestRoadmapItem(title, {
              description: { en: LONG, cy: "" },
            })}
            organisations={[]}
          />
        ))}
      </ul>,
    )

    const names = screen.getAllByRole("button").map((b) => b.textContent)
    expect(new Set(names).size).toBe(2)
  })

  it("shows a short field whole, with no button, and keeps its line breaks (S5)", () => {
    renderCard({ description: { en: `${SHORT}\nsecond line`, cy: "" } })

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    const text = screen.getByText(/second line/)
    expect(text.textContent).toBe(`${SHORT}\nsecond line`)
    expect(text.closest("dd")).toHaveClass("whitespace-pre-line")
  })

  it("says Show more and Show less in Welsh, naming the field (S9)", async () => {
    const user = userEvent.setup()
    renderCard({ description: { en: LONG, cy: "" } }, "cy", "Eitem un")

    await user.click(showMore("Dangos mwy o'r disgrifiad ar gyfer Eitem un"))
    expect(
      showMore("Dangos llai o'r disgrifiad ar gyfer Eitem un"),
    ).toBeInTheDocument()
  })
})

describe("a card's long list of details", () => {
  /** A top-level detail at each of `lines`, the first of them "a" and so on. */
  function renderDetails(lines: readonly number[]) {
    const names = lines.map((_, index) => `detail ${String(index + 1)}`)
    drawLines((text) => lines[names.indexOf(text)] ?? 1)
    renderCard({
      details: names.map((name) => ({ text: { en: name, cy: "" }, level: 0 })),
    })
    /** The text of the detail at this place, from 1. */
    return (place: number) => screen.getByText(`detail ${String(place)}`)
  }

  it("clamps the detail the third line falls within, to the lines it has left (S3)", () => {
    const detail = renderDetails([2, 2, 1])
    const [first, second, third] = [detail(1), detail(2), detail(3)]

    expect(first.className).not.toContain("line-clamp")
    expect(second).toHaveClass("line-clamp-1")
    expect(third.className).not.toContain("line-clamp")
    expect(second.closest("ul")?.parentElement).toHaveClass("overflow-hidden")
    expect(
      showMore("Show more of the details of First item"),
    ).toBeInTheDocument()
  })

  it("clamps a single detail that wraps past three lines to three (S3)", () => {
    const only = renderDetails([6])(1)

    expect(only).toHaveClass("line-clamp-3")
  })

  it("gives no ellipsis to a detail where the cut falls between two (S3)", () => {
    const detail = renderDetails([1, 2, 1])

    for (const place of [1, 2, 3]) {
      expect(detail(place).className).not.toContain("line-clamp")
    }
    expect(
      showMore("Show more of the details of First item"),
    ).toBeInTheDocument()
  })

  it("shows a list of three lines whole, with no button (S5)", () => {
    renderDetails([1, 1, 1])

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("shows the whole list as Show less says (S4)", async () => {
    const user = userEvent.setup()
    const second = renderDetails([2, 2, 1])(2)

    await user.click(showMore(/^Show more/))
    expect(second).not.toHaveClass("line-clamp-1")
    expect(screen.getByRole("button")).toHaveAccessibleName(
      "Show less of the details of First item",
    )
  })
})
