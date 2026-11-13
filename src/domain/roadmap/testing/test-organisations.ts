import type { Organisation } from "../organisation"

/**
 * Organisations for tests (test code only), in no useful order: All Wales and the ones
 * the tests' items name, with the real ids, codes and names (ADR-014).
 */
export const TEST_ORGANISATIONS: readonly Organisation[] = [
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
    id: "national",
    code: "National",
    shortName: "All Wales",
    name: { en: "All Wales", cy: "Cymru gyfan" },
    national: true,
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
