import { describe, expect, it } from "vitest"

import { createI18n } from "@/i18n"

import { AS_PLAIN_WORDS } from "./plain-words"

describe("AS_PLAIN_WORDS", () => {
  // As the catalogue writes the element, and as a translator might without its space.
  it.each(["Remove “<title />”?", "Remove “<title/>”?"])(
    "reads %s with the text where its element stands",
    (sentence) => {
      const i18n = createI18n()
      i18n.addResource(
        "en",
        "translation",
        "roadmaps.edit.removal.title",
        sentence,
      )
      expect(
        i18n.t("roadmaps.edit.removal.title", {
          title: "First & <b>",
          ...AS_PLAIN_WORDS,
        }),
      ).toBe("Remove “First & <b>”?")
    },
  )
})
