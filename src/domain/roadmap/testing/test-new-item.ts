import {
  NO_CHANGES,
  type NewItem,
  type RoadmapChanges,
} from "../roadmap-changes"

/**
 * A new item for tests (test code only): placed `now`, with this ID and title and no
 * other field unless `values` gives it.
 */
function createTestNewItem(
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

/** A roadmap's changes with these new items pending and nothing else. */
export function addingItems(...newItems: NewItem[]): RoadmapChanges {
  return { ...NO_CHANGES, newItems }
}

/** A new item with a title and a placement alone, in Next. */
export const NEW_CLINIC = createTestNewItem(
  "ckn7q2xw",
  "Choose a clinic closer to home",
  { placement: "next" },
)

/**
 * A new item with every field, as typed: its text untrimmed, its organisations out of
 * order and its details nested to the third level.
 */
export const NEW_LETTERS = createTestNewItem(
  "fwd9s3hj",
  "  Letters by email ",
  {
    description: " Read your letters online.\nNo post. ",
    expectedOutcome: "Fewer lost letters",
    phase: "Discovery",
    placement: "delivered-this-year",
    tags: "Patients, Carers",
    organisationIds: "sbuhb, national",
    details: "Appointment letters\n- Outpatients\n-- Adult clinics first",
  },
)
