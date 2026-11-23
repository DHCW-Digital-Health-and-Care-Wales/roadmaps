import { expect, test } from "@playwright/test"
import { BOTH } from "./tags.ts"

// Compares each page's accessibility tree (roles, names and text) with the
// YAML in e2e/__snapshots__. After an intended change, run
// `pnpm site:test:e2e --update-snapshots` and review the diff.
// A page whose tree is the same on a phone is kept once, for desktop; the
// product pages differ there (the menu button, no section navigation), so each
// has a file for both projects.
const pages = {
  landing: "en/",
  product: "en/producta/",
  "not-found": "en/nope/",
  accessibility: "en/accessibility/",
  privacy: "en/privacy/",
  "landing-cy": "cy/",
  "product-cy": "cy/producta/",
  "privacy-cy": "cy/privacy/",
}
const differsOnPhone = ["product", "product-cy"]

for (const [name, path] of Object.entries(pages)) {
  const details = differsOnPhone.includes(name) ? BOTH : {}
  test(`${name} page structure`, details, async ({ page }) => {
    await page.goto(path)
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.locator("body")).toMatchAriaSnapshot({
      name: `${name}.aria.yml`,
    })
  })
}
