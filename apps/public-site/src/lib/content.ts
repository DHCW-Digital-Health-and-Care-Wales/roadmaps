/**
 * What every roadmap shares, besides its text: where each section goes, the
 * landing page categories' icons and colours, and the organisations' groups
 * and sheet codes. Their names and descriptions are in the catalogues
 * (src/i18n/locales/), under `horizons`, `sections`, `categories`,
 * `organisationGroups` and `organisations`.
 */
import {
  Ambulance,
  Database,
  FlaskConical,
  Hospital,
  House,
  LayoutGrid,
  ShieldPlus,
  type LucideIcon,
} from "lucide-react"
import {
  CATEGORY_IDS,
  ORGANISATION_IDS,
  ORGANISATION_SHEET_VALUES,
  SECTION_IDS,
  type CategoryId,
  type OrganisationId,
  type SectionId,
} from "./types"

const SECTION_PLACEMENT: Record<SectionId, "before" | "after"> = {
  "recently-delivered": "before",
  "delivered-this-year": "after",
  "not-doing": "after",
}

export const SECTIONS = SECTION_IDS.map((id) => ({
  id,
  placement: SECTION_PLACEMENT[id],
}))

/** Id of the "Other roadmaps" group, for roadmaps with no Category. */
type CategoryKey = CategoryId | "other"

/** A landing page group of roadmaps. */
export interface Category<Id extends CategoryKey = CategoryKey> {
  id: Id
  /** Icon background, at least 3:1 contrast against white. */
  colour: string
  icon: LucideIcon
}

const CATEGORY_LOOKS: Record<CategoryId, Omit<Category, "id">> = {
  "public-health-apps": { colour: "#0b7a5a", icon: ShieldPlus },
  "gp-community-services": { colour: "#325083", icon: House },
  "tests-scans-results": { colour: "#0e7189", icon: FlaskConical },
  "urgent-emergency-care": { colour: "#b3261e", icon: Ambulance },
  "hospital-specialist-care": { colour: "#6b3fa0", icon: Hospital },
  "national-systems-data": { colour: "#7a4a00", icon: Database },
}

/** Landing page categories in display order. */
export const CATEGORIES: Category<CategoryId>[] = CATEGORY_IDS.map((id) => ({
  id,
  ...CATEGORY_LOOKS[id],
}))

/** The last landing page group, for roadmaps with no Category. */
export const OTHER_CATEGORY: Category<"other"> = {
  id: "other",
  colour: "#5a6675",
  icon: LayoutGrid,
}

/** Groups of organisations in the filter's dropdown, in display order. */
export const ORGANISATION_GROUP_IDS = [
  "all-wales",
  "health-boards",
  "nhs-trusts",
  "special-health-authorities",
  "other-nhs-wales-bodies",
] as const

type OrganisationGroupId = (typeof ORGANISATION_GROUP_IDS)[number]

/** An organisation a card's work can be for. */
export interface Organisation {
  id: OrganisationId
  group: OrganisationGroupId
  /** The sheet code, shown after the name in the dropdown; '' for National. */
  code: string
}

const ORGANISATION_GROUP: Record<OrganisationId, OrganisationGroupId> = {
  national: "all-wales",
  abuhb: "health-boards",
  bcuhb: "health-boards",
  cavuhb: "health-boards",
  ctmuhb: "health-boards",
  hduhb: "health-boards",
  pthb: "health-boards",
  sbuhb: "health-boards",
  vunhst: "nhs-trusts",
  wast: "nhs-trusts",
  phw: "nhs-trusts",
  heiw: "special-health-authorities",
  dhcw: "special-health-authorities",
  pi: "other-nhs-wales-bodies",
}

/** Organisations in display order. */
export const ORGANISATIONS: Organisation[] = ORGANISATION_IDS.map((id) => ({
  id,
  group: ORGANISATION_GROUP[id],
  code: id === "national" ? "" : ORGANISATION_SHEET_VALUES[id],
}))
