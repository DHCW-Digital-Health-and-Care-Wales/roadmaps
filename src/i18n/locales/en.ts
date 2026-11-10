import type { AuthErrorCode, AuthState } from "@/domain/auth/auth-client"
import type { AppErrorKind } from "@/lib/errors"

/**
 * English copy: the source of truth for every message key (ADR-008). Other catalogues
 * are typed against this shape. Keys are camelCase; plural keys carry CLDR suffixes.
 */
export const en = {
  common: {
    appName: "DHCW Roadmap Editor",
    /** The header's name on narrow screens. */
    shortAppName: "Roadmaps",
    loading: "Loading…",
    retry: "Retry",
  },
  layout: {
    skipToContent: "Skip to main content",
    home: "DHCW Roadmap Editor home",
    notifications: "Notifications",
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
    notifications: {
      connected: "Connected to Google",
      disconnected: "Disconnected from Google",
    },
  },
  roadmaps: {
    title: "Your roadmaps",
    description: "Roadmaps available in the connected spreadsheet.",
    refresh: "Refresh",
    loading: "Loading roadmaps…",
    count_zero: "No roadmaps",
    count_one: "{{count, number}} roadmap",
    count_other: "{{count, number}} roadmaps",
    empty: {
      title: "No roadmaps yet",
      description:
        "There are no visible roadmaps in the connected spreadsheet yet.",
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
      notFoundDescription:
        "This roadmap doesn't exist or is no longer visible.",
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
