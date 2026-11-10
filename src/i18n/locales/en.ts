import type { AuthErrorCode, AuthState } from "@/domain/auth/auth-client"
import type { RoadmapCategory } from "@/domain/roadmap/roadmap-category"
import type { AppErrorKind } from "@/lib/errors"

/**
 * English copy: the source of truth for every message key (ADR-008). Other catalogues
 * are typed against this shape. Keys are camelCase; plural keys carry CLDR suffixes.
 */
export const en = {
  common: {
    appName: "DHCW Roadmap Editor",
    /**
     * The header's name beside the DHCW logo, which already says "DHCW"; the document
     * title and the home link keep the full `appName`.
     */
    headerName: "Roadmap Editor",
    /** The header's name on narrow screens. */
    shortAppName: "Roadmaps",
    loading: "Loading…",
    retry: "Retry",
    close: "Close",
    /** A time left, e.g. "1 minute and 49 seconds". */
    duration: {
      minutes_one: "{{count, number}} minute",
      minutes_other: "{{count, number}} minutes",
      seconds_one: "{{count, number}} second",
      seconds_other: "{{count, number}} seconds",
      minutesAndSeconds:
        '$t(common.duration.minutes, {"count": {{minutes}} }) and $t(common.duration.seconds, {"count": {{seconds}} })',
    },
    /** A calendar date written out, e.g. "1 October 2026". */
    date: "{{day}} {{month}} {{year}}",
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
  layout: {
    skipToContent: "Skip to main content",
    home: "DHCW Roadmap Editor home",
    /** The DHCW logo's alternative text: the organisation's name. */
    logoAlt: "Digital Health and Care Wales",
    phase: {
      tag: "Beta",
      text: "This is a new service. Your feedback will help us improve it.",
      feedback: "Give feedback",
      opensInNewTab: "(opens in a new tab)",
    },
    footer: {
      copyright: "© Digital Health and Care Wales",
      version: "Version {{version}}",
    },
  },
  landing: {
    tagline:
      "Keep your products' public roadmaps up to date: now, next and later.",
    source: "Your roadmaps are currently sourced from Google Sheets.",
    accessNote:
      "You'll need to connect Google so the app can load your roadmaps.",
  },
  auth: {
    connect: "Connect Google",
    reconnect: "Reconnect",
    disconnect: "Disconnect",
    status: {
      initializing: "Getting ready…",
      ready: "Not connected",
      connecting: "Connecting…",
      connected: "Google connected",
      expired: "Session expired",
      error: "Connection failed",
    } satisfies Record<AuthState["status"], string>,
    errors: {
      "script-load-failed":
        "Google couldn't be reached. Check your internet connection and try again.",
      "access-denied":
        "Access wasn't granted, so your roadmaps can't be loaded.",
      "scope-not-granted":
        "Access to Google Sheets is needed to load your roadmaps. Connect again and allow it.",
      unknown:
        "Something went wrong while connecting to Google. Please try again.",
      "popup-closed":
        "The Google window was closed before connecting finished.",
      "popup-blocked":
        "Your browser blocked the Google window. Allow pop-ups for this site and try again.",
    } satisfies Record<AuthErrorCode, string>,
    /** Confirmations, shown as a notice at the top of the page (no toasts). */
    notifications: {
      connected: "Connected to Google",
      disconnected: "Disconnected from Google",
    },
    notice: {
      /** The notice's close button, read by assistive technology. */
      dismiss: "Dismiss message",
    },
    /** A failed "Stay connected": the reason (`auth.errors.*`) goes between the two. */
    renewal: {
      failed: "Couldn't keep you connected",
      reconnectLater: "You'll need to reconnect when your session ends.",
    },
    /** The warning two minutes before the session ends. */
    sessionWarning: {
      title: "Your session is about to end",
      /** Shown with a live countdown, and announced each minute and at 30 seconds. */
      endsIn: "Your session ends in {{remaining}}.",
      afterwards: "After that, you'll need to reconnect.",
      stayConnected: "Stay connected",
    },
  },
  roadmaps: {
    title: "Your roadmaps",
    description: "Every roadmap, published or not.",
    refresh: "Refresh",
    loading: "Loading roadmaps…",
    count_zero: "No roadmaps",
    count_one: "{{count, number}} roadmap",
    count_other: "{{count, number}} roadmaps",
    unpublishedCount_one: "{{count, number}} not published",
    unpublishedCount_other: "{{count, number}} not published",
    // "3 roadmaps, 1 not published": the nested keys keep each part's plural forms.
    countWithUnpublished:
      '$t(roadmaps.count, {"count": {{total}} }), $t(roadmaps.unpublishedCount, {"count": {{unpublished}} })',
    /** The heading over the roadmaps in no product family, when others have one. */
    noFamily: "No product family",
    /** The public site's category names, as its landing page writes them. */
    categories: {
      "public-health-apps": "Public Health & Apps",
      "gp-community-services": "GP & Community Services",
      "tests-scans-results": "Tests, Scans & Results",
      "urgent-emergency-care": "Urgent & Emergency Care",
      "hospital-specialist-care": "Hospital & Specialist Care",
      "national-systems-data": "National Systems & Data",
    } satisfies Record<RoadmapCategory, string>,
    card: {
      productLead: "Product lead: {{name}}",
      updated: "Updated {{date}}",
      notPublished: "Not published",
    },
    empty: {
      title: "No roadmaps yet",
      description: "The connected spreadsheet doesn't list any roadmaps yet.",
    },
    loadFailed: "Couldn't load your roadmaps",
    refreshFailed: "Couldn't refresh your roadmaps",
    expired: {
      title: "Your session has expired",
      description: "Reconnect to Google to load your latest roadmaps.",
    },
    detail: {
      title: "Roadmap",
      comingSoon: "Roadmap details are coming soon.",
      back: "Back to roadmaps",
      connectPrompt: "Connect Google to view this roadmap.",
      notFoundTitle: "Roadmap not found",
      notFoundDescription: "This roadmap doesn't exist or is no longer listed.",
    },
  },
  errors: {
    unauthenticated: "Your session has expired. Reconnect to continue.",
    forbidden:
      "You don't have access to this spreadsheet. Ask the spreadsheet owner for access.",
    "not-found":
      "The spreadsheet couldn't be found. Check that it still exists.",
    "rate-limited": "Too many requests right now. Wait a moment and try again.",
    network: "Couldn't connect. Check your internet connection and try again.",
    "invalid-response": "The roadmap data was in an unexpected format.",
    "invalid-data":
      "The list of roadmaps in the spreadsheet isn't in the expected format. Ask the spreadsheet owner to check it.",
    unknown: "Something went wrong. Please try again.",
  } satisfies Record<AppErrorKind, string>,
  notFound: {
    title: "Page not found",
    description: "The page you're looking for doesn't exist.",
    home: "Go to the home page",
  },
  theme: {
    switchToDark: "Switch to dark theme",
    switchToLight: "Switch to light theme",
  },
  language: {
    label: "Language",
  },
} as const
