import {
  EXAMPLE_INDEX_ROWS,
  EXAMPLE_SPREADSHEET,
  roadmapRow,
  type FakeTab,
} from "./fake-sheets"

type WorldRoadmap = [sheet: string, title: string, titleCy: string]

/**
 * The navigation analysis's sample world (EPC-014): 14 roadmaps in four families and
 * the roadmaps with none, enough to scroll the navigation at 1280 × 800. Planted: "care"
 * is in two titles and inside "Carers'"; "prescri" spans two families; "ffon" finds
 * "Ffôn" without its accent; "single" finds a family by its name; one title wraps.
 */
const FAMILIES: [family: string, familyCy: string, WorldRoadmap[]][] = [
  [
    "Citizen Services",
    "Gwasanaethau Dinasyddion",
    [
      ["booking", "Appointment booking", "Trefnu apwyntiadau"],
      ["ffon", "Ffôn Iechyd helpline", "Llinell gymorth Ffôn Iechyd"],
      ["messaging", "Patient messaging", "Negeseua cleifion"],
      ["prescriptions", "Prescriptions online", "Presgripsiynau ar-lein"],
    ],
  ],
  [
    "Medicines & Diagnostics",
    "Meddyginiaethau a Diagnosteg",
    [
      ["eprescribing", "Electronic prescribing", "Presgripsiynu electronig"],
      ["pathology", "Pathology results", "Canlyniadau patholeg"],
      ["radiology", "Radiology requests", "Ceisiadau radioleg"],
    ],
  ],
  [
    "Single Record",
    "Cofnod Sengl",
    [
      ["viewer", "Care record viewer", "Gwyliwr cofnodion gofal"],
      ["notes", "Clinical notes", "Nodiadau clinigol"],
      ["careplans", "Shared care plans", "Cynlluniau gofal a rennir"],
    ],
  ],
  [
    "Workforce",
    "Gweithlu",
    [
      ["rostering", "Rostering", "Rhestrau dyletswydd"],
      ["directory", "Staff directory", "Cyfeiriadur staff"],
    ],
  ],
  [
    "",
    "",
    [
      ["carers", "Carers' register", "Cofrestr gofalwyr"],
      [
        "proms",
        "Patient-reported outcome measures collection",
        "Casglu mesurau canlyniadau a adroddir gan gleifion",
      ],
    ],
  ],
]

const [INDEX_HEADER = []] = EXAMPLE_INDEX_ROWS
const [TAB_HEADER = []] =
  EXAMPLE_SPREADSHEET.find((tab) => tab.title === "ProductA")?.rows ?? []

/**
 * The sample world as a spreadsheet: its index, then a tab per roadmap holding only its
 * header (a roadmap with no items), then the example's `Template`.
 */
export const NAVIGATION_WORLD: readonly FakeTab[] = [
  {
    title: "Roadmaps",
    rows: [
      INDEX_HEADER,
      ...FAMILIES.flatMap(([family, familyCy, roadmaps]) =>
        roadmaps.map(([sheet, title, titleCy]) =>
          roadmapRow({
            Sheet: sheet,
            Enabled: "Yes",
            Title: title,
            "Title (cy)": titleCy,
            Family: family,
            "Family (cy)": familyCy,
            "Status label": "Beta",
            "Last updated": "2026-11-01",
          }),
        ),
      ),
    ],
  },
  ...FAMILIES.flatMap(([, , roadmaps]) =>
    roadmaps.map(([sheet]) => ({ title: sheet, rows: [TAB_HEADER] })),
  ),
  ...EXAMPLE_SPREADSHEET.filter((tab) => tab.title === "Template"),
]
