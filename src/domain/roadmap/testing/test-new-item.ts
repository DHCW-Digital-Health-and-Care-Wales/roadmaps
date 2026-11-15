import type { NewItem } from "../roadmap-changes"

/**
 * A new item for tests (test code only): placed `now`, with this ID and title and no
 * other field unless `values` gives it.
 */
export function createTestNewItem(
  id: string,
  title: string,
  values: Partial<Omit<NewItem["values"], "title">> = {},
): NewItem {
  return {
    id,
    values: {
      title,
      description: "",
      expectedOutcome: "",
      phase: "",
      placement: "now",
      tags: "",
      organisationIds: "",
      details: "",
      ...values,
    },
  }
}
