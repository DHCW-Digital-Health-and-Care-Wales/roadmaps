import type { AuthErrorCode, AuthState } from "@/domain/auth/auth-client"
import type { RoadmapCategory } from "@/domain/roadmap/roadmap-category"
import type {
  EditableItemField,
  EditableRoadmapField,
} from "@/domain/roadmap/roadmap-changes"
import type { RoadmapPlacement } from "@/domain/roadmap/roadmap-placement"
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
    cancel: "Cancel",
    /** A page notice's close button, read by assistive technology. */
    dismiss: "Dismiss message",
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
    },
    /** A roadmap's badge, on its card and its page. */
    notPublished: "Not published",
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
      back: "Back to roadmaps",
      connectPrompt: "Connect Google to view this roadmap.",
      notFoundTitle: "Roadmap not found",
      notFoundDescription: "This roadmap doesn't exist or is no longer listed.",
      /** In place of `notFoundDescription` once pending changes were lost with it. */
      removedDescription:
        "This roadmap was removed from the list, so your changes to it couldn't be kept.",
    },
    /** The roadmap's own text, on its page. */
    about: {
      title: "About this roadmap",
      empty: "There's nothing about this roadmap yet.",
      fields: {
        statusLabel: "Status",
        productLead: "Product lead",
        vision: "Vision",
        serviceDescription: "Service description",
      },
    },
    /** A roadmap's items, on its page. */
    items: {
      loading: "Loading roadmap items…",
      loadFailed: "Couldn't load this roadmap's items",
      refreshFailed: "Couldn't refresh this roadmap's items",
      /** In place of `errors.invalid-data`, which is about the roadmap list. */
      invalidData:
        "This roadmap's items aren't in the expected format in the spreadsheet. Ask the spreadsheet owner to check them.",
      empty: {
        title: "No items yet",
        description: "This roadmap doesn't have any items yet.",
      },
      /** Under a horizon or section heading that has no items. */
      noneInPlacement: "No items",
      /** The headings, worded as the values a Product Lead types (D10). */
      placements: {
        "recently-delivered": "Recently delivered",
        now: "Now",
        next: "Next",
        later: "Later",
        "delivered-this-year": "Delivered this year",
        "not-doing": "Not doing",
      } satisfies Record<RoadmapPlacement, string>,
      /** The group of items with no recognised horizon, which the public site leaves out. */
      unplaced: {
        title: "Not on the public roadmap",
        description:
          "These items need a horizon before the public site shows them.",
        /** `horizon` is the text as written in the item's horizon. */
        unknownHorizon: "Horizon “{{horizon}}” isn't recognised",
        noHorizon: "No horizon",
      },
      fields: {
        phase: "Phase",
        description: "Description",
        expectedOutcome: "Expected outcome",
        tags: "Tags",
        organisations: "Organisations",
        details: "Details",
      },
    },
    /** Editing a roadmap's English text, kept pending until published or saved. */
    edit: {
      /** Followed by what is edited, for assistive technology: "Edit First item". */
      edit: "Edit",
      /** Confirms a form: not "Save", which names the write on an unpublished roadmap. */
      done: "Done",
      /** Followed by what is undone, for assistive technology. */
      undo: "Undo changes",
      /** The tag on whatever holds a pending change. */
      changed: "Changed",
      titleRequired: "Enter a title",
      /** Read before an error message by assistive technology. */
      errorPrefix: "Error:",
      /** Each label says the field is the English, in Welsh (Welsh is not edited yet). */
      itemFields: {
        title: "Title",
        description: "Description",
        expectedOutcome: "Expected outcome",
        phase: "Phase",
      } satisfies Record<EditableItemField, string>,
      roadmapFields: {
        title: "Title",
        statusLabel: "Status",
        productLead: "Product lead",
        vision: "Vision",
        serviceDescription: "Service description",
      } satisfies Record<EditableRoadmapField, string>,
    },
    /** Writing a roadmap's pending changes: "publish" if published, "save" if not. */
    publish: {
      pending: {
        publish_one: "{{count, number}} unpublished change",
        publish_other: "{{count, number}} unpublished changes",
        save_one: "{{count, number}} change to save",
        save_other: "{{count, number}} changes to save",
      },
      /** On a roadmap's card in the list. */
      marker: {
        publish: "Unpublished changes",
        save: "Changes to save",
      },
      action: {
        publish: "Publish changes",
        save: "Save changes",
      },
      discardAll: "Discard all",
      discard: {
        title: "Discard all changes to this roadmap?",
        description:
          "Every change you've made here will be lost. This can't be undone.",
        confirm: "Discard all changes",
      },
      dialog: {
        title: {
          publish: "Publish these changes?",
          save: "Save these changes?",
        },
        note: {
          publish: "The public site shows them after its next nightly update.",
          save: "This roadmap isn't published, so nothing will be public.",
        },
        /** Lists what changes, by roadmap section or item title. */
        changes: "What changes",
      },
      notice: {
        published:
          "Changes published. The public site shows them after its next nightly update.",
        saved: "Changes saved",
        failed: {
          publish: "Couldn't publish your changes",
          save: "Couldn't save your changes",
        },
        /** After every failure: nothing pending is lost. */
        kept: "Your changes are kept in this tab.",
        /** A publish stopped by someone else's changes, reviewed field by field. */
        refused: {
          /** While any field is still to decide. */
          title: "Someone else has changed text you edited",
          /** Once every field is decided, while removed items are still reported. */
          partialTitle: "Some changes couldn't be kept",
          nothing: {
            publish: "Nothing was published.",
            save: "Nothing was saved.",
          },
          choose: {
            publish: "Choose which text to keep for each, then publish again.",
            save: "Choose which text to keep for each, then save again.",
          },
          /** A field to decide: "First item: Title", or "About this roadmap: Vision". */
          target: "{{subject}}: {{field}}",
          yours: "Your change",
          theirs: "Current text",
          /** In place of a value that is blank. */
          empty: "No text",
          /** Followed by the field, for assistive technology. */
          keepMine: "Keep mine",
          /** Followed by the field, for assistive technology. */
          useTheirs: "Use theirs",
          /** `title` is the item's title as it was loaded. */
          removed:
            "Someone else has removed or changed “{{title}}”, so your changes to it couldn't be kept.",
          otherKept: "Your other changes are kept in this tab.",
        },
        unconfirmed: {
          title: {
            publish: "Your changes may have been published",
            save: "Your changes may have been saved",
          },
          description:
            "The answer was lost. Refresh this roadmap before you do anything else.",
        },
      },
      /** Why a publish failed, in place of `errors.*`, which are about reading. */
      errors: {
        unauthenticated: "Your session has expired. Reconnect, then try again.",
        forbidden:
          "This Google account isn't allowed to change this roadmap. Ask the spreadsheet owner for edit access.",
        "not-found": "This roadmap is no longer listed.",
        "rate-limited":
          "Too many requests right now. Wait a moment and try again.",
        network:
          "Couldn't connect. Check your internet connection and try again.",
        "invalid-response": "The answer was in an unexpected format.",
        "invalid-data":
          "This roadmap isn't in the expected format in the spreadsheet. Ask the spreadsheet owner to check it.",
        unknown: "Something went wrong. Please try again.",
      } satisfies Record<AppErrorKind, string>,
    },
    /** Asked on Disconnect while changes are pending. */
    disconnect: {
      title: "Keep your changes?",
      description_one:
        "You've changed {{count, number}} roadmap without publishing or saving it. Keep the changes in this tab for when you connect again, or discard them.",
      description_other:
        "You've changed {{count, number}} roadmaps without publishing or saving them. Keep the changes in this tab for when you connect again, or discard them.",
      keep: "Keep changes and disconnect",
      discard: "Discard changes and disconnect",
    },
    /** On the start page, after Disconnect kept changes. */
    waiting: {
      title_one: "Changes to {{count, number}} roadmap are waiting",
      title_other: "Changes to {{count, number}} roadmaps are waiting",
      description:
        "Connect Google to publish or save them. Closing or reloading this tab loses them.",
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
