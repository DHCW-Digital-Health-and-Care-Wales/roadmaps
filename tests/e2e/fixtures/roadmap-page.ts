import type { Locator, Page } from "@playwright/test"

import type { Language } from "./look"
import { expect } from "./test"

// A roadmap's page as STY-052 shaped it: Refresh and "Unpublish roadmap" in the title
// row's More, and a publish someone else's changes stopped reviewed in a dialog, opened
// from its notice at the foot.

const COPY = {
  en: {
    more: "More",
    refresh: "Refresh",
    review: "Review the changes",
    refused: "Someone else has changed this roadmap too",
  },
  cy: {
    more: "Mwy",
    refresh: "Adnewyddu",
    review: "Adolygu'r newidiadau",
    refused: "Mae rhywun arall wedi newid y map trywydd hwn hefyd",
  },
} as const satisfies Record<Language, Record<string, string>>

/** The title row's More, which opens the menu. */
export function moreButton(page: Page, language: Language = "en"): Locator {
  return page
    .getByRole("main")
    .getByRole("button", { name: COPY[language].more })
}

/** Opens More and chooses `item`. */
export async function chooseFromMore(
  page: Page,
  item: string,
  language: Language = "en",
): Promise<void> {
  await moreButton(page, language).click()
  await page.getByRole("menu").getByRole("menuitem", { name: item }).click()
  await expect(page.getByRole("menu")).toBeHidden()
}

/** Reads the roadmap's page again, from More. */
export function refreshRoadmap(
  page: Page,
  language: Language = "en",
): Promise<void> {
  return chooseFromMore(page, COPY[language].refresh, language)
}

/** The notice at the foot saying a publish was refused, while a field is undecided. */
export function refusal(page: Page, language: Language = "en"): Locator {
  return page
    .getByRole("main")
    .getByRole("alert")
    .filter({ hasText: COPY[language].refused })
}

/** The review of a refused publish, open or not. */
export function conflictReview(page: Page, language: Language = "en"): Locator {
  return page.getByRole("dialog", { name: COPY[language].refused })
}

/**
 * Opens the review from the refusal notice's "Review the changes" and returns it, once
 * focus is in it.
 */
export async function openConflictReview(
  page: Page,
  language: Language = "en",
): Promise<Locator> {
  await refusal(page, language)
    .getByRole("button", { name: COPY[language].review })
    .click()
  const review = conflictReview(page, language)
  await expect(review.getByRole("button").first()).toBeFocused()
  return review
}
