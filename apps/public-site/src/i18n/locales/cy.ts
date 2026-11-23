import type { Catalogue } from "../catalogue"
import { plural } from "../plural"
import { sentence } from "../sentence"
import type { en } from "./en"

/**
 * The public site's Welsh text, typed against `en`, so a missing or extra key fails type
 * checking, as does a count that is not `plural("cy", …)` with all six Welsh forms (0,
 * 1, 2, 3, 6 and everything else).
 */
export const cy = {
  site: {
    title: "Trywyddion IGDC",
    skipLink: "Neidio i’r prif gynnwys",
    backToTop: "Nôl i’r brig",
    organisation: "Iechyd a Gofal Digidol Cymru",
    organisationFooter:
      "Digital Health and Care Wales / Iechyd a Gofal Digidol Cymru",
    homeLink: "Hafan trywyddion Iechyd a Gofal Digidol Cymru",
    phaseBadge: "Beta",
    phaseBanner:
      "Mae hwn yn wasanaeth newydd. Rydym yn dal i weithio ar ffyrdd o’i wella.",
    chooseLanguage: "Dewis iaith / Choose language",
    giveFeedback: "Rhoi adborth",
    viewAllRoadmaps: "Gweld pob trywydd",
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
  header: {
    sectionsNav: "Adrannau’r trywydd",
    about: "Am y trywydd hwn",
    roadmap: "Y trywydd",
    openMenu: "Agor y ddewislen",
    closeMenu: "Cau’r ddewislen",
  },
  footer: {
    nav: "Dolenni troedyn",
    roadmapData: "Data’r trywydd (JSON)",
    licence: "Trwydded",
    onGitHub: "Y gwaith ar GitHub",
    listView: "Golwg rhestr",
    cardView: "Golwg cardiau",
  },
  infoPages: {
    accessibility: {
      heading: "Datganiad hygyrchedd",
      target:
        "Rydym am i gymaint o bobl â phosibl allu defnyddio’r trywyddion hyn. Rydym yn anelu at gydymffurfio â Chanllawiau Hygyrchedd Cynnwys Gwe (WCAG) 2.2 ar lefel AA.",
    },
    privacy: {
      heading: "Preifatrwydd",
      tracking:
        "Nid yw’r safle hwn yn gosod cwcis. Rydym yn defnyddio Simple Analytics, gwasanaeth sy’n rhoi blaenoriaeth i breifatrwydd ac nad yw’n defnyddio cwcis nac yn casglu data personol, i gyfrif ymweliadau.",
      fonts:
        "Mae’r ffontiau’n cael eu gwesteia gennym ni ein hunain, felly nid yw eich ymweliad yn cael ei rannu â gwasanaeth ffont allanol.",
    },
  },
  landing: {
    title: "Trywyddion cynnyrch",
    intro:
      "Mae’r trywyddion hyn yn dangos yr hyn rydym yn gweithio arno, yr hyn rydym yn disgwyl ei wneud nesaf ar hyn o bryd a ble rydym yn meddwl ein bod yn anelu. Nid cynlluniau sefydlog yw’r rhain a byddant yn newid wrth i ni ddysgu.",
    aboutHeading: "Am y trywyddion hyn",
    aboutOpen:
      "Rydym yn credu bod bod yn agored am ein cynlluniau yn well nag aros nes bod popeth yn berffaith. Bydd y trywyddion hyn yn esblygu wrth i ni ddysgu, wrth i flaenoriaethau newid ac wrth i ni glywed gan y bobl sy’n defnyddio ac yn dibynnu ar ein gwasanaethau.",
    aboutBeta:
      "Mae’r trywyddion hefyd mewn beta. Rydym yn parhau i fireinio a datblygu eu cynnwys fel eu bod yn rhoi’r hyn sydd ei angen ar ein defnyddwyr a’n partneriaid iddynt ddeall ein cenhadaeth a’n blaenoriaethau.",
    aboutFeedback:
      "Byddem wrth ein bodd yn gwybod beth yw eich barn. Bydd eich adborth yn ein helpu i wella’r trywyddion hyn a’r ffordd rydym yn cyfathrebu ein cynlluniau.",
    browseCategories: "Pori yn ôl categori",
    search: "Chwilio trywyddion",
    findProduct: "Dod o hyd i gynnyrch",
    findProductHint: "Chwilio yn ôl enw, teulu cynnyrch neu ddisgrifiad",
    // Welsh uses the singular noun after a number, mutated after 2, 3 and 6.
    roadmapCount: plural("cy", {
      zero: (count) => `${count} trywydd`,
      one: (count) => `${count} trywydd`,
      two: (count) => `${count} drywydd`,
      few: (count) => `${count} thrywydd`,
      many: (count) => `${count} thrywydd`,
      other: (count) => `${count} trywydd`,
    }),
    showingRoadmaps: ({ shown, total }) =>
      `Yn dangos ${shown} o ${total} trywydd`,
    showingRoadmapsFor: ({ shown, total, organisation }) =>
      `Yn dangos ${shown} o ${total} trywydd ar gyfer ${organisation}`,
    showingRoadmapsForWithNational: ({ shown, total, organisation }) =>
      `Yn dangos ${shown} o ${total} trywydd ar gyfer ${organisation}, gan gynnwys gwaith Cymru gyfan`,
    noMatches:
      "Does dim trywyddion yn cyfateb i’ch chwiliad. Rhowch gynnig ar air gwahanol.",
    noMatchesFor: ({ organisation }) =>
      `Does dim trywyddion yn cyfateb i’ch chwiliad ar gyfer ${organisation}. Rhowch gynnig ar air gwahanol.`,
    noRoadmaps: "Does dim trywyddion wedi’u cyhoeddi eto.",
    noWorkFor: ({ organisation }) =>
      `Does dim trywyddion â gwaith ar gyfer ${organisation} eto.`,
    showAllOrganisations: "Dangos pob sefydliad",
    countOf: ({ shown, total }) => `${shown} o ${total}`,
    itemsFor: ({ organisation }) => `eitem ar gyfer ${organisation}`,
    updated: ({ date }) => sentence("Diweddarwyd ", date),
    viewRoadmap: "Gweld y trywydd",
  },
  filter: {
    byOrganisation: "Hidlo yn ôl sefydliad",
    filteredByOrganisation: ({ organisation }) =>
      `Wedi’i hidlo yn ôl sefydliad: ${organisation}`,
    filteredBy: ({ organisation }) => `Wedi’i hidlo yn ôl: ${organisation}`,
    organisation: "Sefydliad",
    organisationHint:
      "Dangos trywyddion a gwaith ar gyfer y sefydliad hwn yn unig",
    allOrganisations: "Pob sefydliad",
    includeAllWales: "Cynnwys gwaith Cymru gyfan",
    includeAllWalesHint:
      "Gwaith ar gyfer pob sefydliad yng Nghymru, fel systemau cenedlaethol",
    clearFilter: "Clirio’r hidlydd",
    clear: "Clirio",
    organisations: "Sefydliadau:",
    byPill: "Hidlo yn ôl",
    showAllItemsAgain: "Dangos pob eitem eto",
    showOnlyWorkFor: ({ organisation }) =>
      `Dangos gwaith ar gyfer ${organisation} yn unig`,
  },
  roadmap: {
    allRoadmaps: "Pob trywydd",
    status: ({ status }) => sentence("Statws: ", status),
    lastUpdated: ({ date }) => sentence("Diweddarwyd ddiwethaf: ", date),
    productLead: ({ name }) => `Arweinydd cynnyrch: ${name}`,
    vision: "Ein gweledigaeth",
    value: "Ein gwerth",
    intro:
      "Mae’r trywydd hwn yn dangos yr hyn rydym yn gweithio arno nawr, yr hyn sy’n dod nesaf a’r cyfeiriad rydym yn disgwyl ei ddilyn yn ddiweddarach.",
    horizonsHeading: "Nawr, Nesaf a Hwyrach",
    horizonNote:
      "Nid ydym yn rhoi dyddiadau ar y gwaith hwn, ac nid yw’r drefn yn rhestr o flaenoriaethau.",
    heading: "Y trywydd",
    description:
      "Mae pob cerdyn yn dangos newid rydym yn gweithio arno nawr, yn bwriadu ymgymryd ag ef nesaf, neu’n gweithio tuag ato yn ddiweddarach.",
    details: "Beth mae hyn yn ei gwmpasu",
    detailsFor: ({ title, hidden }) =>
      sentence("Beth mae hyn yn ei gwmpasu", hidden(sentence(": ", title))),
    outcome: "Canlyniad",
    tags: "Tagiau:",
    atAGlance: "Cipolwg",
    openAll: "Agor y cyfan",
    closeAll: "Cau’r cyfan",
    nothingYet: "Dim byd i’w ddangos yma eto.",
    nothingFor: ({ organisation }) => `Dim byd ar gyfer ${organisation} yma.`,
    showHiddenItems: plural("cy", {
      zero: (count) => `Dangos ${count} eitem gudd`,
      one: (count) => `Dangos ${count} eitem gudd`,
      two: (count) => `Dangos ${count} eitem gudd`,
      few: (count) => `Dangos ${count} eitem gudd`,
      many: (count) => `Dangos ${count} eitem gudd`,
      other: (count) => `Dangos ${count} eitem gudd`,
    }),
    showingItemsFor: ({ shown, total, organisation }) =>
      `Yn dangos ${shown} o ${total} eitem ar gyfer ${organisation}`,
    showingItemsForWithNational: ({ shown, total, organisation }) =>
      `Yn dangos ${shown} o ${total} eitem ar gyfer ${organisation}, gan gynnwys gwaith Cymru gyfan`,
    showingAllItems: ({ total }) => `Yn dangos pob un o’r ${total} eitem`,
    includesAllWales: "Mae’n cynnwys gwaith ar gyfer Cymru gyfan.",
    filterHelp:
      "Mae’r rhif wrth ymyl pob pennawd yn dangos faint o eitemau sy’n cyfateb. Dewiswch sefydliad ar unrhyw gerdyn i newid iddo.",
    showAllItems: "Dangos pob eitem",
    countInParentheses: ({ value }) => `(${value})`,
    ofTotal: ({ total }) => `o ${total}`,
  },
  notFound: {
    heading: "Heb ddod o hyd i’r trywydd",
    body: ({ slug }) =>
      `Ni allem ddod o hyd i drywydd o’r enw “${slug}”. Efallai ei fod wedi symud neu wedi’i ddileu.`,
    generic:
      "Ni allem ddod o hyd i’r dudalen honno. Efallai ei bod wedi symud neu wedi’i dileu.",
  },
  horizons: {
    now: {
      label: "Nawr",
      definition:
        "Gwaith sydd ar y gweill nawr ac sy’n llywio’r newidiadau nesaf i’r gwasanaeth.",
    },
    next: {
      label: "Nesaf",
      definition:
        "Gwaith rydym yn disgwyl ei ddechrau cyn bo hir wrth i’r gwaith cyflawni presennol fynd rhagddo.",
    },
    later: {
      label: "Hwyrach",
      definition:
        "Cyfeiriad tymor hwy a fydd yn parhau i esblygu wrth i ni ddysgu mwy.",
    },
  },
  sections: {
    "recently-delivered": {
      heading: "Wedi’i gyflawni’n ddiweddar",
      description:
        "Gwaith rydym wedi’i gwblhau’n ddiweddar ac sydd bellach yn fyw yn y gwasanaeth.",
    },
    "delivered-this-year": {
      heading: "Gwaith arall rydym wedi’i gyflawni eleni",
      description:
        "Golwg ehangach ar y gwaith a gyflawnwyd eleni sydd y tu allan i brif orwelion y trywydd.",
    },
    "not-doing": {
      heading: "Ddim yn cael ei wneud ar hyn o bryd",
      description:
        "Mae bod yn glir am yr hyn nad ydym yn ei wneud yn cadw’r ffocws lle mae’n bwysig.",
    },
  },
  categories: {
    "public-health-apps": {
      label: "Iechyd y Cyhoedd ac Apiau",
      description: "Brechu, sgrinio a gwasanaethau digidol i’r cyhoedd",
    },
    "gp-community-services": {
      label: "Meddygon Teulu a Gwasanaethau Cymunedol",
      description:
        "Meddygfeydd, fferyllfeydd cymunedol a gofal yn nes at adref",
    },
    "tests-scans-results": {
      label: "Profion, Sganiau a Chanlyniadau",
      description:
        "Gwneud cais am brofion, systemau labordy ac adrodd ar ganlyniadau",
    },
    "urgent-emergency-care": {
      label: "Gofal Brys ac Argyfwng",
      description: "Adrannau achosion brys a gofal heb ei drefnu",
    },
    "hospital-specialist-care": {
      label: "Gofal Ysbyty ac Arbenigol",
      description:
        "Cofnodion ysbyty, nyrsio, fferylliaeth a gwasanaethau arbenigol",
    },
    "national-systems-data": {
      label: "Systemau a Data Cenedlaethol",
      description: "Cofnodion a rennir, data cenedlaethol a systemau cysylltu",
    },
    other: {
      label: "Trywyddion eraill",
      description: "Trywyddion nad ydynt mewn categori eto",
    },
  },
  organisationGroups: {
    "all-wales": "Cymru gyfan",
    "health-boards": "Byrddau iechyd",
    "nhs-trusts": "Ymddiriedolaethau GIG",
    "special-health-authorities": "Awdurdodau iechyd arbennig",
    "other-nhs-wales-bodies": "Cyrff eraill GIG Cymru",
  },
  organisations: {
    national: {
      name: "Cymru gyfan (cenedlaethol)",
      short: "Cymru gyfan",
    },
    abuhb: {
      name: "Bwrdd Iechyd Prifysgol Aneurin Bevan",
      short: "Aneurin Bevan",
    },
    bcuhb: {
      name: "Bwrdd Iechyd Prifysgol Betsi Cadwaladr",
      short: "Betsi Cadwaladr",
    },
    cavuhb: {
      name: "Bwrdd Iechyd Prifysgol Caerdydd a’r Fro",
      short: "Caerdydd a’r Fro",
    },
    ctmuhb: {
      name: "Bwrdd Iechyd Prifysgol Cwm Taf Morgannwg",
      short: "Cwm Taf Morgannwg",
    },
    hduhb: {
      name: "Bwrdd Iechyd Prifysgol Hywel Dda",
      short: "Hywel Dda",
    },
    pthb: {
      name: "Bwrdd Iechyd Addysgu Powys",
      short: "Powys",
    },
    sbuhb: {
      name: "Bwrdd Iechyd Prifysgol Bae Abertawe",
      short: "Bae Abertawe",
    },
    vunhst: {
      name: "Ymddiriedolaeth GIG Prifysgol Felindre",
      short: "Felindre",
    },
    wast: {
      name: "Ymddiriedolaeth GIG Prifysgol Gwasanaethau Ambiwlans Cymru",
      short: "Gwasanaethau Ambiwlans Cymru",
    },
    phw: {
      name: "Iechyd Cyhoeddus Cymru",
      short: "Iechyd Cyhoeddus Cymru",
    },
    heiw: {
      name: "Addysg a Gwella Iechyd Cymru",
      short: "AaGIC",
    },
    dhcw: {
      name: "Iechyd a Gofal Digidol Cymru",
      short: "Iechyd a Gofal Digidol Cymru",
    },
    pi: {
      name: "Perfformiad a Gwella GIG Cymru",
      short: "Perfformiad a Gwella",
    },
  },
} satisfies Catalogue<typeof en, "cy">
