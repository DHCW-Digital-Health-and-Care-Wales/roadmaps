import { describe, expect, it } from "vitest"

import type { ContentLanguage } from "@/domain/roadmap/localised-text"

import { showContent } from "./shown-content"

describe("showContent", () => {
  it.each<
    [string, ContentLanguage, string, string, ContentLanguage | undefined]
  >([
    [
      "Welsh with its Welsh, unmarked",
      "cy",
      "Cynnyrch A",
      "Cynnyrch A",
      undefined,
    ],
    [
      "English in place of empty Welsh, marked English",
      "cy",
      "",
      "Product A",
      "en",
    ],
    [
      "English in English, unmarked",
      "en",
      "Cynnyrch A",
      "Product A",
      undefined,
    ],
    [
      "English with no Welsh, unmarked in English",
      "en",
      "",
      "Product A",
      undefined,
    ],
  ])("shows %s", (_, language, cy, text, lang) => {
    expect(showContent({ en: "Product A", cy }, language)).toEqual({
      text,
      lang,
    })
  })
})
