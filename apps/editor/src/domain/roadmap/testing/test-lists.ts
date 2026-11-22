import type { Category } from "../category"
import type { Family } from "../family"

// The family and category lists for tests (test code only), named as the example
// spreadsheet names them (`tests/e2e/fixtures/fake-sheets.ts`), but for one family's
// Welsh name. A test that needs a list imports these; one that needs another family or
// category adds it to them.

/** A family with a Welsh name. */
export const SINGLE_RECORD: Family = {
  id: "fc29g5b9",
  name: { en: "Single Record", cy: "Cofnod Sengl" },
  colour: "#12a3c9",
}

/** A family with no Welsh name, and an `&` in its English one. */
export const MEDICINES_AND_DIAGNOSTICS: Family = {
  id: "vdkxj63m",
  name: { en: "Medicines & Diagnostics", cy: "" },
  colour: "#006747",
}

/** The family list, in its order. */
export const TEST_FAMILIES: readonly Family[] = [
  SINGLE_RECORD,
  MEDICINES_AND_DIAGNOSTICS,
]

export const GP_AND_COMMUNITY_SERVICES: Category = {
  id: "khzpchkh",
  name: {
    en: "GP & Community Services",
    cy: "Meddygon Teulu a Gwasanaethau Cymunedol",
  },
}

export const TESTS_SCANS_AND_RESULTS: Category = {
  id: "w7vrv5kn",
  name: {
    en: "Tests, Scans & Results",
    cy: "Profion, Sganiau a Chanlyniadau",
  },
}

/** The category list, in its order. */
export const TEST_CATEGORIES: readonly Category[] = [
  GP_AND_COMMUNITY_SERVICES,
  TESTS_SCANS_AND_RESULTS,
]
