import type { ReactNode } from "react"
import { CATEGORY_SHEET_VALUES } from "../../lib/types"
import { plural } from "../plural"
import { sentence } from "../sentence"

/**
 * The public site's English text (ADR-008): its interface, and the fixed text it owns
 * about horizons, sections, categories and organisations. Roadmap content stays in the
 * sheet. The source of truth: `cy.ts` is typed against it. A function fills in values,
 * such as a count or a name, and `sentence()` places an element, such as roadmap content.
 */
export const en = {
  site: {
    title: "DHCW roadmaps",
    skipLink: "Skip to content",
    backToTop: "Back to top",
    organisation: "Digital Health and Care Wales",
    organisationFooter: "Digital Health and Care Wales",
    homeLink: "Digital Health and Care Wales roadmaps home",
    phaseBadge: "Beta",
    phaseBanner:
      "This is a new service. We’re still working on ways to improve it.",
    chooseLanguage: "Dewis iaith / Choose language",
    giveFeedback: "Give feedback",
    viewAllRoadmaps: "View all roadmaps",
    months: {
      january: "January",
      february: "February",
      march: "March",
      april: "April",
      may: "May",
      june: "June",
      july: "July",
      august: "August",
      september: "September",
      october: "October",
      november: "November",
      december: "December",
    },
  },
  header: {
    sectionsNav: "Roadmap sections",
    about: "About this roadmap",
    roadmap: "The roadmap",
    openMenu: "Open menu",
    closeMenu: "Close menu",
  },
  footer: {
    nav: "Footer links",
    roadmapData: "Roadmap data (JSON)",
    licence: "Licence",
    onGitHub: "This project on GitHub",
    listView: "List view",
    cardView: "Card view",
  },
  infoPages: {
    accessibility: {
      heading: "Accessibility statement",
      target:
        "We want as many people as possible to be able to use these roadmaps. We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.2 at level AA.",
    },
    privacy: {
      heading: "Privacy",
      tracking:
        "This site sets no cookies. We use Simple Analytics, a privacy-first service that does not use cookies or collect personal data, to count visits.",
      fonts:
        "Fonts are self-hosted, so your visit is not shared with an external font service.",
    },
  },
  landing: {
    title: "Product roadmaps",
    // Also the landing page's meta description, so keep it short.
    intro:
      "These roadmaps show what we’re working on, what we currently expect to do next and where we think we’re heading. They are not fixed plans and will change as we learn.",
    aboutHeading: "About these roadmaps",
    aboutOpen:
      "We believe being open about our plans is better than waiting until everything is perfect. These roadmaps will evolve as we learn, priorities change and we hear from the people who use and depend on our services.",
    aboutBeta:
      "The roadmaps are also in beta. We are continuing to refine and develop their content so they give our users and our partners what they need to understand our mission and priorities.",
    aboutFeedback:
      "We’d really like to know what you think. Your feedback will help us improve both these roadmaps and how we communicate our plans.",
    browseCategories: "Browse by category",
    search: "Search roadmaps",
    findProduct: "Find a product",
    findProductHint: "Search by name, product family or description",
    roadmapCount: plural("en", {
      one: (count) => `${count} roadmap`,
      other: (count) => `${count} roadmaps`,
    }),
    showingRoadmaps: ({ shown, total }: { shown: number; total: number }) =>
      `Showing ${shown} of ${total} roadmaps`,
    showingRoadmapsFor: ({
      shown,
      total,
      organisation,
    }: {
      shown: number
      total: number
      organisation: string
    }) => `Showing ${shown} of ${total} roadmaps for ${organisation}`,
    showingRoadmapsForWithNational: ({
      shown,
      total,
      organisation,
    }: {
      shown: number
      total: number
      organisation: string
    }) =>
      `Showing ${shown} of ${total} roadmaps for ${organisation}, including all-Wales work`,
    noMatches: "No roadmaps match your search. Try a different word.",
    noMatchesFor: ({ organisation }: { organisation: string }) =>
      `No roadmaps match your search for ${organisation}. Try a different word.`,
    noRoadmaps: "No roadmaps have been published yet.",
    noWorkFor: ({ organisation }: { organisation: string }) =>
      `No roadmaps have work for ${organisation} yet.`,
    showAllOrganisations: "Show all organisations",
    // A product card's share of items, e.g. "5 of 9" then "items for Powys".
    countOf: ({ shown, total }: { shown: number; total: number }) =>
      `${shown} of ${total}`,
    itemsFor: ({ organisation }: { organisation: string }) =>
      `items for ${organisation}`,
    updated: ({ date }: { date: ReactNode }) => sentence("Updated ", date),
    viewRoadmap: "View roadmap",
  },
  filter: {
    // `organisation` is an organisation's short name, or its name where said so.
    byOrganisation: "Filter by organisation",
    filteredByOrganisation: ({ organisation }: { organisation: string }) =>
      `Filtered by organisation: ${organisation}`,
    filteredBy: ({ organisation }: { organisation: string }) =>
      `Filtered by: ${organisation}`,
    organisation: "Organisation",
    organisationHint: "Show only roadmaps and work for this organisation",
    allOrganisations: "All organisations",
    includeAllWales: "Include all-Wales work",
    includeAllWalesHint:
      "Work for every organisation in Wales, such as national systems",
    clearFilter: "Clear filter",
    clear: "Clear",
    organisations: "Organisations:",
    // Hidden text before an organisation pill's name.
    byPill: "Filter by",
    showAllItemsAgain: "Show all items again",
    showOnlyWorkFor: ({ organisation }: { organisation: string }) =>
      `Show only work for ${organisation}`,
  },
  roadmap: {
    allRoadmaps: "All roadmaps",
    status: ({ status }: { status: ReactNode }) => sentence("Status: ", status),
    lastUpdated: ({ date }: { date: ReactNode }) =>
      sentence("Last updated: ", date),
    productLead: ({ name }: { name: string }) => `Product lead: ${name}`,
    vision: "Our vision",
    value: "Our value",
    intro:
      "This roadmap shows what we're working on now, what's coming next and the direction we expect to take later.",
    horizonsHeading: "Now, Next and Later",
    horizonNote:
      "We don't put dates on this work, and the order isn't a priority list.",
    heading: "The roadmap",
    description:
      "Each card shows a change we're working on now, planning to take on next, or working towards later.",
    details: "What this covers",
    // The details' summary, naming the item for screen readers alone.
    detailsFor: ({
      title,
      hidden,
    }: {
      title: ReactNode
      hidden: (text: ReactNode) => ReactNode
    }) => sentence("What this covers", hidden(sentence(": ", title))),
    outcome: "Outcome",
    tags: "Tags:",
    atAGlance: "At a glance",
    openAll: "Open all",
    closeAll: "Close all",
    nothingYet: "Nothing to show here yet.",
    nothingFor: ({ organisation }: { organisation: string }) =>
      `Nothing for ${organisation} here.`,
    showHiddenItems: plural("en", {
      one: (count) => `Show ${count} hidden item`,
      other: (count) => `Show ${count} hidden items`,
    }),
    showingItemsFor: ({
      shown,
      total,
      organisation,
    }: {
      shown: number
      total: number
      organisation: string
    }) => `Showing ${shown} of ${total} items for ${organisation}`,
    showingItemsForWithNational: ({
      shown,
      total,
      organisation,
    }: {
      shown: number
      total: number
      organisation: string
    }) =>
      `Showing ${shown} of ${total} items for ${organisation}, including all-Wales work`,
    showingAllItems: ({ total }: { total: number }) =>
      `Showing all ${total} items`,
    includesAllWales: "Includes work for all of Wales.",
    filterHelp:
      "The count next to each heading shows how many items match. Select an organisation on any card to switch to it.",
    showAllItems: "Show all items",
    countInParentheses: ({ value }: { value: string }) => `(${value})`,
    // After a filtered count in the list view's "At a glance", e.g. "2 of 5".
    ofTotal: ({ total }: { total: number }) => `of ${total}`,
  },
  notFound: {
    heading: "Roadmap not found",
    body: ({ slug }: { slug: string }) =>
      `We couldn’t find a roadmap called “${slug}”. It may have moved or been removed.`,
    generic: "We couldn’t find that page. It may have moved or been removed.",
  },
  horizons: {
    now: {
      label: "Now",
      definition:
        "Work that is underway now and shaping the next changes to the service.",
    },
    next: {
      label: "Next",
      definition:
        "Work we expect to pick up soon as current delivery moves forward.",
    },
    later: {
      label: "Later",
      definition:
        "Longer-term direction that will keep evolving as we learn more.",
    },
  },
  sections: {
    "recently-delivered": {
      heading: "Recently delivered",
      description:
        "Work we've completed recently and that is now live in the service.",
    },
    "delivered-this-year": {
      heading: "Other work we have delivered this year",
      description:
        "A broader view of the delivery this year that sits outside the main roadmap horizons.",
    },
    "not-doing": {
      heading: "Not doing right now",
      description:
        "Being clear about what we’re not doing keeps the focus where it matters.",
    },
  },
  // The English labels are the sheet's Category values.
  categories: {
    "public-health-apps": {
      label: CATEGORY_SHEET_VALUES["public-health-apps"],
      description: "Vaccination, screening and digital services for the public",
    },
    "gp-community-services": {
      label: CATEGORY_SHEET_VALUES["gp-community-services"],
      description: "GP practices, community pharmacies and care closer to home",
    },
    "tests-scans-results": {
      label: CATEGORY_SHEET_VALUES["tests-scans-results"],
      description: "Requesting tests, laboratory systems and reporting results",
    },
    "urgent-emergency-care": {
      label: CATEGORY_SHEET_VALUES["urgent-emergency-care"],
      description: "Emergency departments and unscheduled care",
    },
    "hospital-specialist-care": {
      label: CATEGORY_SHEET_VALUES["hospital-specialist-care"],
      description:
        "Hospital records, nursing, pharmacy and specialist services",
    },
    "national-systems-data": {
      label: CATEGORY_SHEET_VALUES["national-systems-data"],
      description: "Shared records, national data and connecting systems",
    },
    other: {
      label: "Other roadmaps",
      description: "Roadmaps not yet in a category",
    },
  },
  organisationGroups: {
    "all-wales": "All of Wales",
    "health-boards": "Health boards",
    "nhs-trusts": "NHS trusts",
    "special-health-authorities": "Special health authorities",
    "other-nhs-wales-bodies": "Other NHS Wales bodies",
  },
  organisations: {
    national: {
      name: "All Wales (national)",
      short: "All Wales",
    },
    abuhb: {
      name: "Aneurin Bevan University Health Board",
      short: "Aneurin Bevan",
    },
    bcuhb: {
      name: "Betsi Cadwaladr University Health Board",
      short: "Betsi Cadwaladr",
    },
    cavuhb: {
      name: "Cardiff and Vale University Health Board",
      short: "Cardiff and Vale",
    },
    ctmuhb: {
      name: "Cwm Taf Morgannwg University Health Board",
      short: "Cwm Taf Morgannwg",
    },
    hduhb: {
      name: "Hywel Dda University Health Board",
      short: "Hywel Dda",
    },
    pthb: {
      name: "Powys Teaching Health Board",
      short: "Powys",
    },
    sbuhb: {
      name: "Swansea Bay University Health Board",
      short: "Swansea Bay",
    },
    vunhst: {
      name: "Velindre University NHS Trust",
      short: "Velindre",
    },
    wast: {
      name: "Welsh Ambulance Services University NHS Trust",
      short: "Welsh Ambulance Services",
    },
    phw: {
      name: "Public Health Wales",
      short: "Public Health Wales",
    },
    heiw: {
      name: "Health Education and Improvement Wales",
      short: "HEIW",
    },
    dhcw: {
      name: "Digital Health and Care Wales",
      short: "Digital Health and Care Wales",
    },
    pi: {
      name: "NHS Wales Performance and Improvement",
      short: "Performance and Improvement",
    },
  },
}
