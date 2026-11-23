import { Trans } from "react-i18next"
import { describe, expect, it } from "vitest"

import type { LocalisedText } from "@/domain/roadmap/localised-text"
import type { Language } from "@/i18n"
import { renderWithI18n } from "@/test/render-with-i18n"

import { ContentText } from "./content-text"

const english: LocalisedText = { en: "First item", cy: "" }
const welsh: LocalisedText = { en: "First item", cy: "Eitem gyntaf" }

/** Content in a sentence of the catalogue, as the removal question asks it. */
function inSentence(title: LocalisedText, language: Language) {
  return renderWithI18n(
    <p>
      <Trans
        i18nKey="roadmaps.edit.removal.title"
        components={{ title: <ContentText value={title} /> }}
      />
    </p>,
    { language },
  ).container
}

// Which content is marked is `showContent`'s rule (`shown-content.test.ts`); this holds
// how the component and a sentence around it carry the mark.
describe("ContentText", () => {
  it("puts English shown in Welsh on an element of its own, marked English (S1)", () => {
    const { container } = renderWithI18n(<ContentText value={english} />, {
      language: "cy",
    })
    expect(container.innerHTML).toBe('<span lang="en">First item</span>')
  })

  it("shows content in the interface's language as text alone (S1)", () => {
    const { container } = renderWithI18n(<ContentText value={welsh} />, {
      language: "cy",
    })
    expect(container.innerHTML).toBe("Eitem gyntaf")
  })

  it("marks only the English inside a Welsh sentence (S2)", () => {
    expect(inSentence(english, "cy").innerHTML).toBe(
      '<p>Tynnu “<span lang="en">First item</span>”?</p>',
    )
  })

  it("marks nothing in an English sentence (S1)", () => {
    expect(inSentence(english, "en").innerHTML).toBe(
      "<p>Remove “First item”?</p>",
    )
  })
})
