import type { Catalogue } from "../catalogue"
import type { en } from "./en"

/** Welsh plural categories (CLDR): 0, 1, 2, 3, 6 and everything else. */
type WelshPluralCategory = "zero" | "one" | "two" | "few" | "many" | "other"

/**
 * Welsh copy (ADR-008). Machine-assisted: a fluent Welsh speaker must review it before a
 * public launch. Typed against `en`, so a missing or extra key fails type checking.
 */
export const cy = {
  common: {
    appName: "Golygydd Mapiau Trywydd IGDC",
    shortAppName: "Mapiau Trywydd",
    loading: "Wrthi'n llwytho…",
    retry: "Ceisio eto",
  },
  layout: {
    skipToContent: "Neidio i'r prif gynnwys",
    home: "Hafan Golygydd Mapiau Trywydd IGDC",
    notifications: "Hysbysiadau",
  },
  landing: {
    tagline:
      "Cadw mapiau trywydd cyhoeddus eich cynhyrchion yn gyfredol: nawr, nesaf a hwyrach.",
    source: "Ar hyn o bryd, daw eich mapiau trywydd o Google Sheets.",
    accessNote:
      "Bydd angen i chi gysylltu â Google er mwyn i'r ap lwytho eich mapiau trywydd.",
  },
  auth: {
    connect: "Cysylltu â Google",
    reconnect: "Ailgysylltu",
    disconnect: "Datgysylltu",
    status: {
      initializing: "Wrthi'n paratoi…",
      ready: "Heb gysylltu",
      connecting: "Wrthi'n cysylltu…",
      connected: "Wedi cysylltu â Google",
      expired: "Sesiwn wedi dod i ben",
      error: "Methodd y cysylltiad",
    },
    errors: {
      "script-load-failed":
        "Doedd dim modd cyrraedd Google. Gwiriwch eich cysylltiad â'r rhyngrwyd a rhowch gynnig arall arni.",
      "access-denied":
        "Ni roddwyd mynediad, felly does dim modd llwytho eich mapiau trywydd.",
      "scope-not-granted":
        "Mae angen mynediad at Google Sheets i lwytho eich mapiau trywydd. Cysylltwch eto a'i ganiatáu.",
      unknown:
        "Aeth rhywbeth o'i le wrth gysylltu â Google. Rhowch gynnig arall arni.",
      "popup-closed": "Caewyd ffenestr Google cyn i'r cysylltu orffen.",
      "popup-blocked":
        "Mae eich porwr wedi rhwystro ffenestr Google. Caniatewch ffenestri naid ar gyfer y wefan hon a rhowch gynnig arall arni.",
    },
    notifications: {
      connected: "Wedi cysylltu â Google",
      disconnected: "Wedi datgysylltu o Google",
    },
  },
  roadmaps: {
    title: "Eich mapiau trywydd",
    description: "Y mapiau trywydd sydd ar gael yn y daenlen gysylltiedig.",
    refresh: "Adnewyddu",
    loading: "Wrthi'n llwytho mapiau trywydd…",
    // Small numerals take a singular noun, and "dau" (2) softens "map" to "fap";
    // larger counts read naturally as "o" plus the softened plural.
    count_zero: "Dim mapiau trywydd",
    count_one: "{{count, number}} map trywydd",
    count_two: "{{count, number}} fap trywydd",
    count_few: "{{count, number}} map trywydd",
    count_many: "{{count, number}} map trywydd",
    count_other: "{{count, number}} o fapiau trywydd",
    empty: {
      title: "Dim mapiau trywydd eto",
      description:
        "Does dim mapiau trywydd gweladwy yn y daenlen gysylltiedig eto.",
    },
    loadFailed: "Doedd dim modd llwytho eich mapiau trywydd",
    refreshFailed: "Doedd dim modd adnewyddu eich mapiau trywydd",
    expired: {
      title: "Mae eich sesiwn wedi dod i ben",
      description:
        "Ailgysylltwch â Google i lwytho eich mapiau trywydd diweddaraf.",
    },
    detail: {
      title: "Map trywydd",
      comingSoon: "Bydd manylion y map trywydd ar gael cyn bo hir.",
      back: "Yn ôl i'r mapiau trywydd",
      connectPrompt: "Cysylltwch â Google i weld y map trywydd hwn.",
      notFoundTitle: "Heb ddod o hyd i'r map trywydd",
      notFoundDescription:
        "Dydy'r map trywydd hwn ddim yn bodoli, neu dydy e ddim yn weladwy mwyach.",
    },
  },
  errors: {
    unauthenticated: "Mae eich sesiwn wedi dod i ben. Ailgysylltwch i barhau.",
    forbidden:
      "Nid oes gennych fynediad at y daenlen hon. Gofynnwch i berchennog y daenlen am fynediad.",
    "not-found":
      "Doedd dim modd dod o hyd i'r daenlen. Gwiriwch ei bod yn dal i fodoli.",
    "rate-limited":
      "Mae gormod o geisiadau ar hyn o bryd. Arhoswch funud a rhowch gynnig arall arni.",
    network:
      "Methu cysylltu. Gwiriwch eich cysylltiad â'r rhyngrwyd a rhowch gynnig arall arni.",
    "invalid-response": "Roedd data'r mapiau trywydd mewn fformat annisgwyl.",
    unknown: "Aeth rhywbeth o'i le. Rhowch gynnig arall arni.",
  },
  notFound: {
    title: "Heb ddod o hyd i'r dudalen",
    description: "Dydy'r dudalen rydych chi'n chwilio amdani ddim yn bodoli.",
    home: "Mynd i'r hafan",
  },
  theme: {
    switchToDark: "Newid i'r thema dywyll",
    switchToLight: "Newid i'r thema olau",
  },
  language: {
    label: "Iaith",
  },
} as const satisfies Catalogue<typeof en, WelshPluralCategory>
