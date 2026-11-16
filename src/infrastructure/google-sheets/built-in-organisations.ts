import type { Organisation } from "@/domain/roadmap/organisation"

/**
 * The twelve organisations, built in because the spreadsheet has no `Organisations` tab
 * (ADR-014). In the public site's order, which is where its parser's order stays.
 * Codes, ids and short names are not translated; the full names are the public site's,
 * except All Wales's, which has no "(national)" since the code beside it says so.
 */
export const BUILT_IN_ORGANISATIONS: readonly Organisation[] = [
  {
    id: "national",
    code: "National",
    shortName: "All Wales",
    name: { en: "All Wales", cy: "Cymru gyfan" },
    national: true,
  },
  {
    id: "abuhb",
    code: "ABUHB",
    shortName: "Aneurin Bevan",
    name: {
      en: "Aneurin Bevan University Health Board",
      cy: "Bwrdd Iechyd Prifysgol Aneurin Bevan",
    },
    national: false,
  },
  {
    id: "bcuhb",
    code: "BCUHB",
    shortName: "Betsi Cadwaladr",
    name: {
      en: "Betsi Cadwaladr University Health Board",
      cy: "Bwrdd Iechyd Prifysgol Betsi Cadwaladr",
    },
    national: false,
  },
  {
    id: "cavuhb",
    code: "CAVUHB",
    shortName: "Cardiff and Vale",
    name: {
      en: "Cardiff and Vale University Health Board",
      cy: "Bwrdd Iechyd Prifysgol Caerdydd a’r Fro",
    },
    national: false,
  },
  {
    id: "ctmuhb",
    code: "CTMUHB",
    shortName: "Cwm Taf Morgannwg",
    name: {
      en: "Cwm Taf Morgannwg University Health Board",
      cy: "Bwrdd Iechyd Prifysgol Cwm Taf Morgannwg",
    },
    national: false,
  },
  {
    id: "hduhb",
    code: "HDUHB",
    shortName: "Hywel Dda",
    name: {
      en: "Hywel Dda University Health Board",
      cy: "Bwrdd Iechyd Prifysgol Hywel Dda",
    },
    national: false,
  },
  {
    id: "pthb",
    code: "PTHB",
    shortName: "Powys",
    name: {
      en: "Powys Teaching Health Board",
      cy: "Bwrdd Iechyd Addysgu Powys",
    },
    national: false,
  },
  {
    id: "sbuhb",
    code: "SBUHB",
    shortName: "Swansea Bay",
    name: {
      en: "Swansea Bay University Health Board",
      cy: "Bwrdd Iechyd Prifysgol Bae Abertawe",
    },
    national: false,
  },
  {
    id: "vunhst",
    code: "VUNHST",
    shortName: "Velindre",
    name: {
      en: "Velindre University NHS Trust",
      cy: "Ymddiriedolaeth GIG Prifysgol Felindre",
    },
    national: false,
  },
  {
    id: "wast",
    code: "WAST",
    shortName: "Welsh Ambulance",
    name: {
      en: "Welsh Ambulance Services University NHS Trust",
      cy: "Ymddiriedolaeth GIG Prifysgol Gwasanaethau Ambiwlans Cymru",
    },
    national: false,
  },
  {
    id: "phw",
    code: "PHW",
    shortName: "Public Health Wales",
    name: { en: "Public Health Wales", cy: "Iechyd Cyhoeddus Cymru" },
    national: false,
  },
  {
    id: "heiw",
    code: "HEIW",
    shortName: "Health Education and Improvement Wales",
    name: {
      en: "Health Education and Improvement Wales",
      cy: "Addysg a Gwella Iechyd Cymru",
    },
    national: false,
  },
]
