import { screen } from "@testing-library/react"
import { createRef } from "react"
import { describe, expect, it } from "vitest"

import type { Language } from "@/i18n"
import { renderWithI18n } from "@/test/render-with-i18n"

import { marked } from "../testing/marked"
import { FamilyConflictReview } from "./family-conflict-review"

describe("FamilyConflictReview (DEF-033 S1)", () => {
  it.each<[Language, string[]]>([
    ["cy", ["en: Shared Record", "en: One Record"]],
    ["en", []],
  ])("marks the English names and no colour, in %s", (language, expected) => {
    renderWithI18n(
      <FamilyConflictReview
        ref={createRef()}
        conflicts={[
          {
            field: "name",
            base: "Single Record",
            pending: "Shared Record",
            current: "One Record",
          },
          {
            field: "colour",
            base: "#000000",
            pending: "#111111",
            current: "#222222",
          },
        ]}
        onKeepMine={() => undefined}
        onUseTheirs={() => undefined}
      />,
      { language },
    )

    expect(marked(screen.getByRole("alert"))).toEqual(expected)
  })
})
