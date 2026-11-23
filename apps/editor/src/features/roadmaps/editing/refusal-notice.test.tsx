import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import { renderWithI18n } from "@/test/render-with-i18n"

import { RemovedItems } from "./refusal-notice"

describe("RemovedItems", () => {
  it("names each removed item once, two kept at one place by refreshes included (CHO-045 S4)", () => {
    // A co-lead's changes moved one edited item to the place another kept from an
    // earlier read, then removed both.
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined)
    renderWithI18n(
      <RemovedItems
        removed={[
          { item: createTestRoadmapItem("First", { id: "a" }), position: 1 },
          { item: createTestRoadmapItem("Second", { id: "b" }), position: 1 },
        ]}
        hasPendingChanges={false}
      />,
    )

    expect(screen.getByText(/“First”/)).toBeInTheDocument()
    expect(screen.getByText(/“Second”/)).toBeInTheDocument()
    expect(error).not.toHaveBeenCalled()
  })
})
