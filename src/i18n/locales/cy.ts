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
    familiesLink: "Teuluoedd, categorïau a sefydliadau",
    lists: {
      outOfStep: "Yn wahanol i'w deulu neu gategori",
      familyNotListed: "Teulu heb ei restru",
      family: "Teulu: {{name}}",
      category: "Categori: {{name}}",
      match: {
        /** Beside a family the list doesn't have, which "Make it match" can't fix (S3). */
        chooseFamily: "Dewiswch ei deulu o dan Ynglŷn â'r map trywydd hwn.",
        action: "Gwneud iddo gyfateb",
        confirm: {
          title: "Gwneud i {{title}} gyfateb i'w deulu a'i gategori?",
          description:
            "Mae'r map trywydd hwn wedi'i gyhoeddi. Bydd y wefan gyhoeddus yn dangos y newid ar ôl ei diweddariad nesaf dros nos.",
          action: "Gwneud iddo gyfateb",
        },
        notice: {
          matched: "Mae {{title}} bellach yn cyfateb i'w deulu a'i gategori",
          matchedPublic:
            "Mae {{title}} bellach yn cyfateb i'w deulu a'i gategori. Bydd y wefan gyhoeddus yn ei ddangos ar ôl ei diweddariad nesaf dros nos.",
          changed:
            "Newidiodd y map trywydd hwn tra oeddech chi'n edrych. Chafodd dim byd ei newid.",
          failed: "Doedd dim modd gwneud i'r map trywydd gyfateb",
        },
        errors: {
          unauthenticated:
            "Mae eich sesiwn wedi dod i ben. Ailgysylltwch, yna rhowch gynnig arall arni.",
          forbidden:
            "Does gan y cyfrif Google hwn ddim hawl i newid mapiau trywydd. Gofynnwch i berchennog y daenlen am fynediad golygu.",
          "not-found":
            "Doedd dim modd dod o hyd i'r daenlen. Gwiriwch ei bod yn dal i fodoli.",
          "rate-limited":
            "Mae gormod o geisiadau ar hyn o bryd. Arhoswch funud a rhowch gynnig arall arni.",
          network:
            "Methu cysylltu. Gwiriwch eich cysylltiad â'r rhyngrwyd a rhowch gynnig arall arni.",
          "invalid-response": "Roedd yr ateb mewn fformat annisgwyl.",
          "invalid-data":
            "Dydy'r rhestr teuluoedd ddim yn y fformat disgwyliedig yn y daenlen. Gofynnwch i berchennog y daenlen ei gwirio.",
          unknown: "Aeth rhywbeth o'i le. Rhowch gynnig arall arni.",
        },
      },
    },
    add: {
      title: "Ychwanegu map trywydd",
      submit: "Ychwanegu'r map trywydd",
      shortName: "Enw byr",
      titleHint: "Yr enw mae'r wefan gyhoeddus yn ei ddangos.",
      addressHint:
        "Bydd ei gyfeiriad cyhoeddus yn gorffen â “{{address}}”. Does dim modd ei newid yma wedyn.",
      shortNameHint:
        "Mae'n gorffen cyfeiriad cyhoeddus y map trywydd. Does dim modd ei newid yma wedyn.",
      note: "Mae'n dechrau heb ei gyhoeddi, heb eitemau. Fydd y wefan gyhoeddus ddim yn ei ddangos nes i chi ei gyhoeddi.",
      errors: {
        shortName: {
          blank: "Rhowch enw byr",
          "invalid-character":
            "Defnyddiwch lythrennau, rhifau, bylchau a chysylltnodau yn unig",
          "too-long": "Defnyddiwch {{max, number}} nod neu lai",
          "no-address": "Cynhwyswch lythyren o a i z, neu rif",
          taken:
            "Mae'r enw byr hwn yn cael ei ddefnyddio eisoes. Dewiswch un arall.",
        },
        notListed: {
          familyId:
            "Dydy'r teulu hwn ddim wedi'i restru mwyach. Dewiswch un arall.",
          categoryId:
            "Dydy'r categori hwn ddim wedi'i restru mwyach. Dewiswch un arall.",
        },
      },
      expired:
        "Ailgysylltwch â Google i ychwanegu'r map trywydd. Mae'r hyn rydych wedi'i deipio wedi'i gadw.",
      failed: {
        title: "Doedd dim modd ychwanegu'r map trywydd",
        errors: {
          unauthenticated:
            "Daeth eich sesiwn i ben cyn iddo gael ei ychwanegu. Rhowch gynnig arall arni.",
          forbidden:
            "Does gan y cyfrif Google hwn ddim hawl i ychwanegu mapiau trywydd. Gofynnwch i berchennog y daenlen am fynediad golygu.",
          "not-found":
            "Doedd dim modd dod o hyd i'r daenlen. Gwiriwch ei bod yn dal i fodoli.",
          "rate-limited":
            "Mae gormod o geisiadau ar hyn o bryd. Arhoswch funud a rhowch gynnig arall arni.",
          network:
            "Methu cysylltu. Gwiriwch eich cysylltiad â'r rhyngrwyd a rhowch gynnig arall arni.",
          "invalid-response": "Roedd yr ateb mewn fformat annisgwyl.",
          "invalid-data":
            "Mae'r templed ar gyfer mapiau trywydd newydd ar goll neu ddim yn y fformat disgwyliedig yn y daenlen. Gofynnwch i berchennog y daenlen ei wirio.",
          unknown: "Aeth rhywbeth o'i le. Rhowch gynnig arall arni.",
        },
      },
      unconfirmed: {
        title: "Efallai bod y map trywydd wedi'i ychwanegu",
        description:
          "Cafodd yr ateb ei golli. Canslwch, yna adnewyddwch eich mapiau trywydd i wirio cyn ei ychwanegu eto.",
      },
      added: "Cafodd {{title}} ei ychwanegu. Dydy e ddim wedi'i gyhoeddi eto.",
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
        lastUpdated: "Diweddarwyd ddiwethaf",
      },
      noDate: "Dim dyddiad",
    },
    items: {
      loading: "Wrthi'n llwytho eitemau'r map trywydd…",
      loadFailed: "Doedd dim modd llwytho eitemau'r map trywydd hwn",
      refreshFailed: "Doedd dim modd adnewyddu eitemau'r map trywydd hwn",
      invalidData:
        "Dydy eitemau'r map trywydd hwn ddim yn y fformat disgwyliedig yn y daenlen. Gofynnwch i berchennog y daenlen eu gwirio.",
      empty: {
        title: "Dim eitemau eto",
        description:
          "Ychwanegwch ei eitemau yn y daenlen am y tro. Byddan nhw'n ymddangos yma ar ôl Adnewyddu.",
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
        placement: "Gorwel neu adran",
        tags: "Tagiau (Saesneg)",
        organisationIds: "Sefydliadau",
        details: "Manylion (Saesneg)",
      },
      organisationChoice: "{{shortName}} ({{code}})",
      unknownOrganisations_zero:
        "Dydy {{codes}} ddim yn cael eu hadnabod. Bydd newid y sefydliadau yn eu tynnu.",
      unknownOrganisations_one:
        "Dydy {{codes}} ddim yn cael ei adnabod. Bydd newid y sefydliadau yn ei dynnu.",
      unknownOrganisations_two:
        "Dydy {{codes}} ddim yn cael eu hadnabod. Bydd newid y sefydliadau yn eu tynnu.",
      unknownOrganisations_few:
        "Dydy {{codes}} ddim yn cael eu hadnabod. Bydd newid y sefydliadau yn eu tynnu.",
      unknownOrganisations_many:
        "Dydy {{codes}} ddim yn cael eu hadnabod. Bydd newid y sefydliadau yn eu tynnu.",
      unknownOrganisations_other:
        "Dydy {{codes}} ddim yn cael eu hadnabod. Bydd newid y sefydliadau yn eu tynnu.",
      organisations: {
        subject: "sefydliadau",
        none: "Dim sefydliadau",
      },
      tags: {
        subject: "tagiau",
        none: "Dim tagiau",
        onItem: "Tagiau ar yr eitem hon",
        rename: "Ailenwi",
        remove: "Tynnu",
        renameField: "Ailenwi {{tag}}",
        update: "Diweddaru",
        cancelRename: "Canslo",
        cancelRenameSubject: "ailenwi {{tag}}",
        add: "Ychwanegu tag",
        addButton: "Ychwanegu",
        addButtonSubject: "tag",
        elsewhere: "Wedi'u defnyddio mewn mannau eraill yn y map trywydd hwn",
        offer_zero: "Ychwanegu {{tag}}, ar {{count, number}} eitem arall",
        offer_one: "Ychwanegu {{tag}}, ar {{count, number}} eitem arall",
        offer_two: "Ychwanegu {{tag}}, ar {{count, number}} eitem arall",
        offer_few: "Ychwanegu {{tag}}, ar {{count, number}} eitem arall",
        offer_many: "Ychwanegu {{tag}}, ar {{count, number}} eitem arall",
        offer_other: "Ychwanegu {{tag}}, ar {{count, number}} eitem arall",
        noMatch: "Does dim tag arall yn cyfateb i “{{typed}}”.",
        added: "Ychwanegwyd {{tags}}.",
        removed: "Tynnwyd “{{tag}}”.",
        undoRemove: "Dadwneud",
        undoRemoveSubject: "tynnu {{tag}}",
        putBack: "Rhoddwyd “{{tag}}” yn ôl.",
        notes: {
          repeat: "Mae “{{tag}}” eisoes ar yr eitem hon.",
          respelt:
            "Ychwanegwyd fel “{{tag}}”, fel mae eitemau eraill yn ei sillafu.",
          respeltRename:
            "Ailenwyd yn “{{tag}}”, fel mae eitemau eraill yn ei sillafu.",
          merged:
            "Mae “{{tag}}” eisoes ar yr eitem hon, felly tynnwyd “{{typed}}”.",
        },
        welshLocked:
          "Mae fersiynau Cymraeg o'r tagiau hyn, felly does dim modd eu newid yma eto.",
      },
      details: {
        subject: "manylion",
        none: "Dim manylion",
        hint: "Mae'r wefan gyhoeddus yn rhestru'r rhain o dan “Beth mae hyn yn ei gynnwys”.",
        keys: "Pwyswch Enter am fanylyn newydd. I nythu un, dechreuwch ef â chysylltnod.",
        name: {
          top: "Manylyn {{position}} o {{total}}, lefel uchaf",
          nested:
            "Manylyn {{position}} o {{total}}, wedi'i nythu o dan “{{parent}}”",
        },
        selected: "Y manylyn a ddewiswyd",
        actions: {
          moveOut: "Symud allan",
          moveIn: "Symud i mewn",
          moveUp: "Symud i fyny",
          moveDown: "Symud i lawr",
          remove: "Tynnu",
        },
        emptySubject: "y manylyn gwag",
        refused: {
          first: "Does dim byd uwchben y manylyn cyntaf iddo nythu oddi tano.",
          nested: "Mae eisoes wedi'i nythu o dan y manylyn uwchben.",
          deepest:
            "Mae tair lefel i restr, felly all hwn ddim mynd yn ddyfnach.",
          top: "Mae eisoes ar y lefel uchaf.",
          firstAtLevel: "Mae eisoes yn gyntaf ar ei lefel.",
          lastAtLevel: "Mae eisoes yn olaf ar ei lefel.",
          nothing: "Does dim manylyn i'w dynnu.",
        },
        said: {
          movedIn: "Symudwyd i mewn, o dan “{{parent}}”.",
          movedOutTop: "Symudwyd allan, i'r lefel uchaf.",
          movedOutUnder: "Symudwyd allan, o dan “{{parent}}”.",
          newTop: "Manylyn newydd ar y lefel uchaf.",
          newUnder: "Manylyn newydd o dan “{{parent}}”.",
          movedUp: "Symudwyd i fyny.",
          movedDown: "Symudwyd i lawr.",
          joined: "Unwyd â'r manylyn uwchben.",
          removedEmpty: "Tynnwyd y manylyn gwag.",
          added_zero: "Ychwanegwyd {{count, number}} manylyn.",
          added_one: "Ychwanegwyd {{count, number}} manylyn.",
          added_two: "Ychwanegwyd {{count, number}} manylyn.",
          added_few: "Ychwanegwyd {{count, number}} manylyn.",
          added_many: "Ychwanegwyd {{count, number}} manylyn.",
          added_other: "Ychwanegwyd {{count, number}} manylyn.",
          removed: "Tynnwyd “{{detail}}”.",
          nestedMoved_zero: "Symudodd y manylyn oddi tano i fyny un lefel.",
          nestedMoved_one: "Symudodd y manylyn oddi tano i fyny un lefel.",
          nestedMoved_two:
            "Symudodd y {{count, number}} manylyn oddi tano i fyny un lefel.",
          nestedMoved_few:
            "Symudodd y {{count, number}} manylyn oddi tano i fyny un lefel.",
          nestedMoved_many:
            "Symudodd y {{count, number}} manylyn oddi tano i fyny un lefel.",
          nestedMoved_other:
            "Symudodd y {{count, number}} manylyn oddi tano i fyny un lefel.",
          putBack: "Rhoddwyd “{{detail}}” yn ôl.",
        },
        undoRemove: "Dadwneud",
        undoRemoveSubject: "tynnu {{detail}}",
        welshLocked:
          "Mae fersiynau Cymraeg o'r manylion hyn, felly does dim modd eu newid yma eto.",
      },
      openingField: {
        change: "Newid",
        add: "Ychwanegu",
        close: "Cau",
      },
      move: "Symud",
      moveTo: "Symud i",
      choosePlacement: "Dewiswch orwel neu adran",
      itemHeading: "Golygu'r eitem hon",
      roadmapHeading: "Golygu'r map trywydd hwn",
      roadmapFields: {
        title: "Teitl (Saesneg)",
        statusLabel: "Statws (Saesneg)",
        productLead: "Arweinydd cynnyrch",
        vision: "Gweledigaeth (Saesneg)",
        serviceDescription: "Disgrifiad o'r gwasanaeth (Saesneg)",
        familyId: "Teulu",
        categoryId: "Categori",
        lastUpdated: "Diweddarwyd ddiwethaf",
      },
      today: "Heddiw",
      dateInFuture: "Rhowch ddyddiad heddiw neu un cynharach",
      dateInvalid: "Rhowch ddyddiad go iawn, neu cliriwch y maes",
      noFamily: "Dim teulu",
      noCategory: "Dim categori",
      familyNotListed: "{{name}} (heb ei restru)",
      choiceUnavailable: {
        familyId: "Does dim modd newid y teulu ar hyn o bryd.",
        categoryId: "Does dim modd newid y categori ar hyn o bryd.",
      },
    },
    /** Publishing or unpublishing a roadmap from its page, written at once (STY-035). */
    publishRoadmap: {
      action: {
        publish: "Cyhoeddi'r map trywydd",
        unpublish: "Dad-gyhoeddi'r map trywydd",
      },
      confirm: {
        title: {
          publish: "Cyhoeddi {{title}}?",
          unpublish: "Dad-gyhoeddi {{title}}?",
        },
        note: {
          publish:
            "Bydd yn ymddangos ar y wefan gyhoeddus ar ôl ei diweddariad nesaf dros nos.",
          unpublish:
            "Bydd yn diflannu o'r wefan gyhoeddus ar ôl ei diweddariad nesaf dros nos.",
        },
        noItems: "Bydd y wefan gyhoeddus yn ei ddangos heb eitemau.",
        withChanges_zero:
          "Bydd eich newidiadau heb eu cadw yn cael eu cyhoeddi gydag ef.",
        withChanges_one:
          "Bydd eich newid heb ei gadw yn cael ei gyhoeddi gydag ef.",
        withChanges_two:
          "Bydd eich {{count, number}} newid heb eu cadw yn cael eu cyhoeddi gydag ef.",
        withChanges_few:
          "Bydd eich {{count, number}} newid heb eu cadw yn cael eu cyhoeddi gydag ef.",
        withChanges_many:
          "Bydd eich {{count, number}} newid heb eu cadw yn cael eu cyhoeddi gydag ef.",
        withChanges_other:
          "Bydd eich {{count, number}} o newidiadau heb eu cadw yn cael eu cyhoeddi gydag ef.",
        keepsChanges_zero:
          "Bydd eich newidiadau heb eu cyhoeddi yn aros, i'w cadw wedyn.",
        keepsChanges_one:
          "Bydd eich newid heb ei gyhoeddi yn aros, i'w gadw wedyn.",
        keepsChanges_two:
          "Bydd eich {{count, number}} newid heb eu cyhoeddi yn aros, i'w cadw wedyn.",
        keepsChanges_few:
          "Bydd eich {{count, number}} newid heb eu cyhoeddi yn aros, i'w cadw wedyn.",
        keepsChanges_many:
          "Bydd eich {{count, number}} newid heb eu cyhoeddi yn aros, i'w cadw wedyn.",
        keepsChanges_other:
          "Bydd eich {{count, number}} o newidiadau heb eu cyhoeddi yn aros, i'w cadw wedyn.",
        saveAndPublish: "Cadw a chyhoeddi",
      },
      notice: {
        published:
          "Mae {{title}} wedi'i gyhoeddi. Bydd y wefan gyhoeddus yn ei ddangos ar ôl ei diweddariad nesaf dros nos.",
        savedAndPublished:
          "Newidiadau wedi'u cadw a {{title}} wedi'i gyhoeddi. Bydd y wefan gyhoeddus yn ei ddangos ar ôl ei diweddariad nesaf dros nos.",
        unpublished:
          "Mae {{title}} wedi'i ddad-gyhoeddi. Bydd yn diflannu o'r wefan gyhoeddus ar ôl ei diweddariad nesaf dros nos.",
        changed:
          "Newidiodd y map trywydd hwn tra oeddech chi'n edrych. Chafodd dim byd ei newid.",
        failed: {
          publish: "Doedd dim modd cyhoeddi {{title}}",
          unpublish: "Doedd dim modd dad-gyhoeddi {{title}}",
        },
        unconfirmed: {
          publish: "Efallai bod {{title}} wedi'i gyhoeddi",
          unpublish: "Efallai bod {{title}} wedi'i ddad-gyhoeddi",
        },
        refused: {
          description:
            "Byddai ei gyhoeddi yn atal y wefan gyhoeddus rhag diweddaru. Cywirwch y daenlen, yna cyhoeddwch eto.",
          problems: {
            itemsMissing:
              "Does dim tab o'r enw “{{location}}”, yr enw yn ei gell Sheet.",
            titleMissing: "Does gan y tab “{{location}}” ddim colofn Title.",
            placementMissing:
              "Does gan y tab “{{location}}” ddim colofn Horizon.",
            shortColour:
              "Mae gan ei liw {{colour}} 3 digid. Ysgrifennwch ef gyda 6, fel {{long}}.",
            idTaken:
              "Mae “{{title}}” wedi'i gyhoeddi gyda'r un cyfeiriad gwe. Dad-gyhoeddwch ef, neu newidiwch un o'u celloedd Sheet.",
          },
        },
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
      markUpdated: "Nodi ei fod wedi'i ddiweddaru heddiw",
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
          welshTags:
            "Mae fersiynau Cymraeg o'r tagiau hyn erbyn hyn, felly does dim modd eu newid yma eto.",
          welshDetails:
            "Mae fersiynau Cymraeg o'r manylion hyn erbyn hyn, felly does dim modd eu newid yma eto.",
          discardMine: "Gwaredu fy newid",
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
    families: {
      title: "Teuluoedd, categorïau a sefydliadau",
      description:
        "Y teuluoedd cynnyrch a'r categorïau sy'n grwpio eich mapiau trywydd, a'r sefydliadau y gall eich eitemau fod ar eu cyfer.",
      connectPrompt:
        "Cysylltwch â Google i weld y teuluoedd, y categorïau a'r sefydliadau.",
      loading: "Wrthi'n llwytho teuluoedd, categorïau a sefydliadau…",
      loadFailed:
        "Doedd dim modd llwytho'r teuluoedd, y categorïau a'r sefydliadau",
      refreshFailed:
        "Doedd dim modd adnewyddu'r teuluoedd, y categorïau a'r sefydliadau",
      heading: "Teuluoedd",
      welshName: "Cymraeg: {{name}}",
      noWelshName: "Dim enw Cymraeg",
      noRoadmaps: "Dim mapiau trywydd",
      published: "Wedi'i gyhoeddi",
      change: "Newid",
      add: "Ychwanegu teulu",
      unavailable: {
        title: "Does dim modd newid teuluoedd ar hyn o bryd",
        description:
          "Mae tab Families y daenlen ar goll neu ddim yn y fformat disgwyliedig. Gofynnwch i berchennog y daenlen ei wirio.",
      },
      form: {
        changeTitle: "Newid {{name}}",
        name: "Enw (Saesneg)",
        colour: "Lliw",
        colourHint: "Lliw hecs, fel #00796b.",
        add: "Ychwanegu'r teulu",
        save: "Cadw'r newidiadau",
        errors: {
          blank: "Rhowch enw",
          taken: "Mae gan deulu arall yr enw hwn",
          invalid: "Rhowch liw fel #00796b",
        },
      },
      confirm: {
        title: "Newid {{name}} ar ei fapiau trywydd?",
        roadmaps_zero: "Does ganddo ddim mapiau trywydd nawr.",
        roadmaps_one: "Mae hyn yn newid {{count, number}} map trywydd:",
        roadmaps_two: "Mae hyn yn newid y ddau fap trywydd:",
        roadmaps_few: "Mae hyn yn newid y {{count, number}} map trywydd:",
        roadmaps_many: "Mae hyn yn newid y {{count, number}} map trywydd:",
        roadmaps_other:
          "Mae hyn yn newid pob un o'r {{count, number}} map trywydd:",
        public:
          "Bydd y mapiau trywydd sydd wedi'u cyhoeddi yn dangos y newid ar y wefan gyhoeddus ar ôl ei diweddariad nesaf dros nos.",
        notPublic:
          "Does dim un ohonyn nhw wedi'i gyhoeddi, felly fydd dim byd yn gyhoeddus.",
        membersChanged:
          "Mae'r mapiau trywydd yn y teulu hwn wedi newid. Gwiriwch nhw eto.",
        action: "Newid y teulu",
      },
      refused: {
        title: "Mae rhywun arall wedi newid y teulu hwn",
        description:
          "Chafodd dim byd ei gadw. Dewiswch pa un i'w gadw ar gyfer pob un, yna cadwch eto.",
        yours: "Eich newid",
        theirs: "Gwerth presennol",
        keepMine: "Cadw fy un i",
        useTheirs: "Defnyddio'u un nhw",
      },
      notice: {
        added: "{{name}} wedi'i ychwanegu",
        changed: "{{name}} wedi'i newid",
        changedPublic:
          "{{name}} wedi'i newid. Bydd y wefan gyhoeddus yn ei ddangos ar ôl ei diweddariad nesaf dros nos.",
        gone: "Dydy'r teulu hwn ddim wedi'i restru mwyach, felly chafodd eich newid mo'i gadw.",
        failed: {
          add: "Doedd dim modd ychwanegu'r teulu",
          change: "Doedd dim modd newid y teulu",
        },
      },
      errors: {
        unauthenticated:
          "Mae eich sesiwn wedi dod i ben. Ailgysylltwch, yna rhowch gynnig arall arni.",
        forbidden:
          "Does gan y cyfrif Google hwn ddim hawl i newid teuluoedd. Gofynnwch i berchennog y daenlen am fynediad golygu.",
        "not-found":
          "Doedd dim modd dod o hyd i'r daenlen. Gwiriwch ei bod yn dal i fodoli.",
        "rate-limited":
          "Mae gormod o geisiadau ar hyn o bryd. Arhoswch funud a rhowch gynnig arall arni.",
        network:
          "Methu cysylltu. Gwiriwch eich cysylltiad â'r rhyngrwyd a rhowch gynnig arall arni.",
        "invalid-response": "Roedd yr ateb mewn fformat annisgwyl.",
        "invalid-data":
          "Dydy'r rhestr teuluoedd ddim yn y fformat disgwyliedig yn y daenlen. Gofynnwch i berchennog y daenlen ei gwirio.",
        unknown: "Aeth rhywbeth o'i le. Rhowch gynnig arall arni.",
      },
      categories: {
        heading: "Categorïau",
        description: "Does dim modd newid categorïau yma eto.",
        none: "Does dim categorïau wedi'u rhestru.",
      },
      organisations: {
        heading: "Sefydliadau",
        description: "Does dim modd newid sefydliadau yma eto.",
        entry: "{{name}} ({{code}})",
        none: "Does dim sefydliadau wedi'u rhestru.",
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
