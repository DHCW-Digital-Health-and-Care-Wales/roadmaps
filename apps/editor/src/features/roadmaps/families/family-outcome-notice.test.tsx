import { screen } from "@testing-library/react"
import { createRef } from "react"
import { describe, expect, it } from "vitest"

import type { Language } from "@/i18n"
import { renderWithI18n } from "@/test/render-with-i18n"

import { marked } from "../testing/marked"
import { FamilyOutcomeNotice } from "./family-outcome-notice"

describe("FamilyOutcomeNotice (DEF-033 S1)", () => {
  it.each<["added" | "changed" | "changedPublic", Language, string[]]>([
    ["added", "cy", ["en: Single Record"]],
    ["changed", "cy", ["en: Single Record"]],
    ["changedPublic", "cy", ["en: Single Record"]],
    ["added", "en", []],
  ])(
    "marks the family's English name, %s in %s",
    (kind, language, expected) => {
      renderWithI18n(
        <FamilyOutcomeNotice
          ref={createRef()}
          notice={{ kind, name: "Single Record" }}
          onDismiss={() => undefined}
        />,
        { language },
      )

      const notice = screen.getByRole("status")
      expect(notice).toHaveTextContent("Single Record")
      expect(marked(notice)).toEqual(expected)
    },
  )
})
