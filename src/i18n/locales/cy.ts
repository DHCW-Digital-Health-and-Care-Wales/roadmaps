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
    headerName: "Golygydd Mapiau Trywydd",
    shortAppName: "Mapiau Trywydd",
    loading: "Wrthi'n llwytho…",
    retry: "Ceisio eto",
    cancel: "Canslo",
    close: "Cau",
    dismiss: "Cau'r neges",
    duration: {
      minutes_zero: "{{count, number}} munud",
      minutes_one: "{{count, number}} munud",
      minutes_two: "{{count, number}} funud",
      minutes_few: "{{count, number}} munud",
      minutes_many: "{{count, number}} munud",
      minutes_other: "{{count, number}} munud",
      seconds_zero: "{{count, number}} eiliad",
      seconds_one: "{{count, number}} eiliad",
      seconds_two: "{{count, number}} eiliad",
      seconds_few: "{{count, number}} eiliad",
      seconds_many: "{{count, number}} eiliad",
      seconds_other: "{{count, number}} eiliad",
      minutesAndSeconds:
        '$t(common.duration.minutes, {"count": {{minutes}} }), $t(common.duration.seconds, {"count": {{seconds}} })',
    },
    date: "{{day}} {{month}} {{year}}",
    months: {
      january: "Ionawr",
      february: "Chwefror",
      march: "Mawrth",
      april: "Ebrill",
      may: "Mai",
      june: "Mehefin",
      july: "Gorffennaf",
      august: "Awst",
      september: "Medi",
      october: "Hydref",
      november: "Tachwedd",
      december: "Rhagfyr",
    },
  },
  layout: {
    skipToContent: "Neidio i'r prif gynnwys",
    home: "Hafan Golygydd Mapiau Trywydd IGDC",
    logoAlt: "Iechyd a Gofal Digidol Cymru",
    phase: {
      tag: "Beta",
      text: "Mae hwn yn wasanaeth newydd. Bydd eich adborth yn ein helpu i'w wella.",
      feedback: "Rhoi adborth",
      opensInNewTab: "(yn agor mewn tab newydd)",
    },
    footer: {
      copyright: "© Iechyd a Gofal Digidol Cymru",
      version: "Fersiwn {{version}}",
    },
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
    renewal: {
      failed: "Doedd dim modd cadw eich cysylltiad",
      reconnectLater:
        "Bydd angen i chi ailgysylltu pan ddaw eich sesiwn i ben.",
    },
    sessionWarning: {
      title: "Mae eich sesiwn ar fin dod i ben",
      endsIn: "Bydd eich sesiwn yn dod i ben ymhen {{remaining}}.",
      afterwards: "Ar ôl hynny, bydd angen i chi ailgysylltu.",
      stayConnected: "Aros yn gysylltiedig",
    },
  },
  roadmaps: {
    title: "Eich mapiau trywydd",
    description: "Pob map trywydd, wedi'i gyhoeddi neu beidio.",
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
    unpublishedCount_zero: "Dim heb eu cyhoeddi",
    unpublishedCount_one: "{{count, number}} heb ei gyhoeddi",
    unpublishedCount_two: "{{count, number}} heb eu cyhoeddi",
    unpublishedCount_few: "{{count, number}} heb eu cyhoeddi",
    unpublishedCount_many: "{{count, number}} heb eu cyhoeddi",
    unpublishedCount_other: "{{count, number}} heb eu cyhoeddi",
    countWithUnpublished:
      '$t(roadmaps.count, {"count": {{total}} }), $t(roadmaps.unpublishedCount, {"count": {{unpublished}} })',
    noFamily: "Dim teulu cynnyrch",
    lists: {
      outOfStep: "Yn wahanol i'w deulu neu gategori",
      familyNotListed: "Teulu heb ei restru",
      family: "Teulu: {{name}}",
      category: "Categori: {{name}}",
    },
    card: {
      productLead: "Arweinydd cynnyrch: {{name}}",
      updated: "Diweddarwyd {{date}}",
    },
    notPublished: "Heb ei gyhoeddi",
    empty: {
      title: "Dim mapiau trywydd eto",
      description:
        "Dydy'r daenlen gysylltiedig ddim yn rhestru unrhyw fapiau trywydd eto.",
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
      back: "Yn ôl i'r mapiau trywydd",
      connectPrompt: "Cysylltwch â Google i weld y map trywydd hwn.",
      notFoundTitle: "Heb ddod o hyd i'r map trywydd",
      notFoundDescription:
        "Dydy'r map trywydd hwn ddim yn bodoli, neu dydy e ddim wedi'i restru mwyach.",
      removedDescription:
        "Cafodd y map trywydd hwn ei dynnu o'r rhestr, felly doedd dim modd cadw eich newidiadau iddo.",
    },
    about: {
      title: "Ynglŷn â'r map trywydd hwn",
      empty: "Does dim byd am y map trywydd hwn eto.",
      fields: {
        statusLabel: "Statws",
        productLead: "Arweinydd cynnyrch",
        vision: "Gweledigaeth",
        serviceDescription: "Disgrifiad o'r gwasanaeth",
      },
    },
    items: {
      loading: "Wrthi'n llwytho eitemau'r map trywydd…",
      loadFailed: "Doedd dim modd llwytho eitemau'r map trywydd hwn",
      refreshFailed: "Doedd dim modd adnewyddu eitemau'r map trywydd hwn",
      invalidData:
        "Dydy eitemau'r map trywydd hwn ddim yn y fformat disgwyliedig yn y daenlen. Gofynnwch i berchennog y daenlen eu gwirio.",
      empty: {
        title: "Dim eitemau eto",
        description: "Does dim eitemau ar y map trywydd hwn eto.",
      },
      noneInPlacement: "Dim eitemau",
      // Nawr, Nesaf and Hwyrach are the public site's Welsh headings.
      placements: {
        "recently-delivered": "Wedi'u cyflawni'n ddiweddar",
        now: "Nawr",
        next: "Nesaf",
        later: "Hwyrach",
        "delivered-this-year": "Wedi'u cyflawni eleni",
        "not-doing": "Ddim yn bwrw ymlaen",
      },
      unplaced: {
        title: "Ddim ar y map trywydd cyhoeddus",
        description:
          "Mae angen gorwel ar yr eitemau hyn cyn i'r wefan gyhoeddus eu dangos.",
        unknownHorizon: "Dydy'r gorwel “{{horizon}}” ddim yn cael ei adnabod",
        noHorizon: "Dim gorwel",
      },
      fields: {
        phase: "Cam",
        description: "Disgrifiad",
        expectedOutcome: "Canlyniad disgwyliedig",
        tags: "Tagiau",
        organisations: "Sefydliadau",
        details: "Manylion",
      },
    },
    edit: {
      edit: "Golygu",
      done: "Gorffen",
      undo: "Dadwneud y newidiadau",
      changed: "Wedi newid",
      titleRequired: "Rhowch deitl",
      errorPrefix: "Gwall:",
      itemFields: {
        title: "Teitl (Saesneg)",
        description: "Disgrifiad (Saesneg)",
        expectedOutcome: "Canlyniad disgwyliedig (Saesneg)",
        phase: "Cam (Saesneg)",
      },
      roadmapFields: {
        title: "Teitl (Saesneg)",
        statusLabel: "Statws (Saesneg)",
        productLead: "Arweinydd cynnyrch",
        vision: "Gweledigaeth (Saesneg)",
        serviceDescription: "Disgrifiad o'r gwasanaeth (Saesneg)",
      },
    },
    publish: {
      pending: {
        publish_zero: "Dim newidiadau heb eu cyhoeddi",
        publish_one: "{{count, number}} newid heb ei gyhoeddi",
        publish_two: "{{count, number}} newid heb eu cyhoeddi",
        publish_few: "{{count, number}} newid heb eu cyhoeddi",
        publish_many: "{{count, number}} newid heb eu cyhoeddi",
        publish_other: "{{count, number}} o newidiadau heb eu cyhoeddi",
        save_zero: "Dim newidiadau i'w cadw",
        save_one: "{{count, number}} newid i'w gadw",
        save_two: "{{count, number}} newid i'w cadw",
        save_few: "{{count, number}} newid i'w cadw",
        save_many: "{{count, number}} newid i'w cadw",
        save_other: "{{count, number}} o newidiadau i'w cadw",
      },
      marker: {
        publish: "Newidiadau heb eu cyhoeddi",
        save: "Newidiadau i'w cadw",
      },
      action: {
        publish: "Cyhoeddi'r newidiadau",
        save: "Cadw'r newidiadau",
      },
      discardAll: "Gwaredu'r cyfan",
      discard: {
        title: "Gwaredu pob newid i'r map trywydd hwn?",
        description:
          "Bydd pob newid rydych chi wedi'i wneud yma yn cael ei golli. Does dim modd dadwneud hyn.",
        confirm: "Gwaredu pob newid",
      },
      dialog: {
        title: {
          publish: "Cyhoeddi'r newidiadau hyn?",
          save: "Cadw'r newidiadau hyn?",
        },
        note: {
          publish:
            "Bydd y wefan gyhoeddus yn eu dangos ar ôl ei diweddariad nesaf dros nos.",
          save: "Dydy'r map trywydd hwn ddim wedi'i gyhoeddi, felly fydd dim byd yn gyhoeddus.",
        },
        changes: "Beth sy'n newid",
      },
      notice: {
        published:
          "Newidiadau wedi'u cyhoeddi. Bydd y wefan gyhoeddus yn eu dangos ar ôl ei diweddariad nesaf dros nos.",
        saved: "Newidiadau wedi'u cadw",
        failed: {
          publish: "Doedd dim modd cyhoeddi eich newidiadau",
          save: "Doedd dim modd cadw eich newidiadau",
        },
        kept: "Mae eich newidiadau wedi'u cadw yn y tab hwn.",
        refused: {
          title: "Mae rhywun arall wedi newid testun a olygoch chi",
          partialTitle: "Doedd dim modd cadw rhai newidiadau",
          nothing: {
            publish: "Chafodd dim byd ei gyhoeddi.",
            save: "Chafodd dim byd ei gadw.",
          },
          choose: {
            publish:
              "Dewiswch pa destun i'w gadw ar gyfer pob un, yna cyhoeddwch eto.",
            save: "Dewiswch pa destun i'w gadw ar gyfer pob un, yna cadwch eto.",
          },
          target: "{{subject}}: {{field}}",
          yours: "Eich newid",
          theirs: "Testun presennol",
          empty: "Dim testun",
          keepMine: "Cadw fy un i",
          useTheirs: "Defnyddio'u testun nhw",
          removed:
            "Mae rhywun arall wedi tynnu neu newid “{{title}}”, felly doedd dim modd cadw eich newidiadau iddo.",
          otherKept: "Mae eich newidiadau eraill wedi'u cadw yn y tab hwn.",
        },
        unconfirmed: {
          title: {
            publish: "Efallai bod eich newidiadau wedi'u cyhoeddi",
            save: "Efallai bod eich newidiadau wedi'u cadw",
          },
          description:
            "Cafodd yr ateb ei golli. Adnewyddwch y map trywydd hwn cyn gwneud unrhyw beth arall.",
        },
      },
      errors: {
        unauthenticated:
          "Mae eich sesiwn wedi dod i ben. Ailgysylltwch, yna rhowch gynnig arall arni.",
        forbidden:
          "Does gan y cyfrif Google hwn ddim hawl i newid y map trywydd hwn. Gofynnwch i berchennog y daenlen am fynediad golygu.",
        "not-found": "Dydy'r map trywydd hwn ddim wedi'i restru mwyach.",
        "rate-limited":
          "Mae gormod o geisiadau ar hyn o bryd. Arhoswch funud a rhowch gynnig arall arni.",
        network:
          "Methu cysylltu. Gwiriwch eich cysylltiad â'r rhyngrwyd a rhowch gynnig arall arni.",
        "invalid-response": "Roedd yr ateb mewn fformat annisgwyl.",
        "invalid-data":
          "Dydy'r map trywydd hwn ddim yn y fformat disgwyliedig yn y daenlen. Gofynnwch i berchennog y daenlen ei wirio.",
        unknown: "Aeth rhywbeth o'i le. Rhowch gynnig arall arni.",
      },
    },
    disconnect: {
      title: "Cadw eich newidiadau?",
      description_zero:
        "Rydych chi wedi newid {{count, number}} map trywydd heb eu cyhoeddi na'u cadw. Cadwch y newidiadau yn y tab hwn ar gyfer pan fyddwch chi'n cysylltu eto, neu gwaredwch nhw.",
      description_one:
        "Rydych chi wedi newid {{count, number}} map trywydd heb ei gyhoeddi na'i gadw. Cadwch y newidiadau yn y tab hwn ar gyfer pan fyddwch chi'n cysylltu eto, neu gwaredwch nhw.",
      description_two:
        "Rydych chi wedi newid {{count, number}} fap trywydd heb eu cyhoeddi na'u cadw. Cadwch y newidiadau yn y tab hwn ar gyfer pan fyddwch chi'n cysylltu eto, neu gwaredwch nhw.",
      description_few:
        "Rydych chi wedi newid {{count, number}} map trywydd heb eu cyhoeddi na'u cadw. Cadwch y newidiadau yn y tab hwn ar gyfer pan fyddwch chi'n cysylltu eto, neu gwaredwch nhw.",
      description_many:
        "Rydych chi wedi newid {{count, number}} map trywydd heb eu cyhoeddi na'u cadw. Cadwch y newidiadau yn y tab hwn ar gyfer pan fyddwch chi'n cysylltu eto, neu gwaredwch nhw.",
      description_other:
        "Rydych chi wedi newid {{count, number}} o fapiau trywydd heb eu cyhoeddi na'u cadw. Cadwch y newidiadau yn y tab hwn ar gyfer pan fyddwch chi'n cysylltu eto, neu gwaredwch nhw.",
      keep: "Cadw'r newidiadau a datgysylltu",
      discard: "Gwaredu'r newidiadau a datgysylltu",
    },
    waiting: {
      title_zero: "Dim newidiadau'n aros",
      title_one: "Mae newidiadau i {{count, number}} map trywydd yn aros",
      title_two: "Mae newidiadau i {{count, number}} fap trywydd yn aros",
      title_few: "Mae newidiadau i {{count, number}} map trywydd yn aros",
      title_many: "Mae newidiadau i {{count, number}} map trywydd yn aros",
      title_other:
        "Mae newidiadau i {{count, number}} o fapiau trywydd yn aros",
      description:
        "Cysylltwch â Google i'w cyhoeddi neu eu cadw. Bydd cau neu ail-lwytho'r tab hwn yn eu colli.",
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
    "invalid-data":
      "Nid yw'r rhestr o fapiau trywydd yn y daenlen yn y fformat disgwyliedig. Gofynnwch i berchennog y daenlen ei gwirio.",
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
