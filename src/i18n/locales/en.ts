import type { AuthErrorCode, AuthState } from "@/domain/auth/auth-client"
import type {
  EditableItemField,
  EditableRoadmapField,
  RoadmapChoiceField,
} from "@/domain/roadmap/roadmap-changes"
import type { RoadmapPlacement } from "@/domain/roadmap/roadmap-placement"
import type { ShortNameProblem } from "@/domain/roadmap/short-name"
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
    /** The header's menu of the theme and the session's action (STY-056). */
    account: "Account",
    /** Said after the service name in the home link's name: "Roadmap Editor home". */
    homeSuffix: "home",
    /** The DHCW logo's alternative text: the organisation's name. */
    logoAlt: "Digital Health and Care Wales",
    /** Said after a link's name when it opens another tab. */
    opensInNewTab: "(opens in a new tab)",
    phase: {
      tag: "Beta",
      text: "This is a new service. Your feedback will help us improve it.",
      feedback: "Give feedback",
    },
    /** The shell's navigation (STY-054): beside the page, or in a drawer on a phone. */
    navigation: {
      /** The navigation landmark's name. */
      label: "Roadmaps",
      /** The button that opens the drawer, and the drawer's title. */
      menu: "Menu",
      closeMenu: "Close menu",
      /** The desktop navigation's button, folding it to a rail of icons (D5). */
      fold: "Fold the navigation",
      /** The same button while folded. */
      unfold: "Open the navigation",
      /**
       * How many roadmaps have unpublished changes (STY-055): the navigation's count, the
       * list of them in the Disconnect question, and the menu button's name, which adds
       * it to "Menu" while there are any (D4).
       */
      unpublished_zero: "No roadmaps have unpublished changes",
      unpublished_one: "{{count, number}} roadmap has unpublished changes",
      unpublished_other: "{{count, number}} roadmaps have unpublished changes",
      menuUnpublished:
        '$t(layout.navigation.menu), $t(layout.navigation.unpublished, {"count": {{roadmaps}} })',
    },
    footer: {
      copyright: "© Digital Health and Care Wales",
      repository: "View on GitHub",
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
      disconnected: "Disconnected from Google",
    },
    /** A failed "Stay connected": the reason (`auth.errors.*`) goes between the two. */
    renewal: {
      failed: "Couldn't keep you connected",
      reconnectLater: "You'll need to reconnect when your session ends.",
    },
    /**
     * Asked when an action that needs a session is pressed after it expired; the action
     * carries on once reconnected. A Reconnect from here that fails says why under
     * `failed`, from `auth.errors.*`.
     */
    reconnectDialog: {
      title: "Your session has expired",
      description:
        "Reconnect to Google to carry on. Your changes are kept in this tab.",
      failed: "Couldn't reconnect",
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
    refresh: "Refresh",
    /** A roadmap's menu of its less frequent actions, in its title row (STY-052 D6). */
    more: "More",
    loading: "Loading roadmaps…",
    count_zero: "No roadmaps",
    count_one: "{{count, number}} roadmap",
    count_other: "{{count, number}} roadmaps",
    unpublishedCount_one: "{{count, number}} not published",
    unpublishedCount_other: "{{count, number}} not published",
    // "3 roadmaps, 1 not published": the nested keys keep each part's plural forms.
    countWithUnpublished:
      '$t(roadmaps.count, {"count": {{total}} }), $t(roadmaps.unpublishedCount, {"count": {{unpublished}} })',
    /** The link to the families, categories and organisations page. */
    familiesLink: "Families, categories and organisations",
    /** The heading over the roadmaps in no product family, when others have one. */
    noFamily: "No product family",
    /** The shell's navigation's own entries (STY-054); its roadmaps are their titles. */
    navigation: {
      /** The link to the roadmap list, the home page (D4). */
      all: "All roadmaps",
      /** A roadmap with unpublished changes: its title, then what its dot shows (STY-055 D1). */
      changed: "{{name}}, unpublished changes",
      /** The search at the top of the navigation (STY-061). */
      search: {
        /** The search box's name, and the rail's spyglass that opens it (S9). */
        label: "Search roadmaps",
        placeholder: "Search",
        clear: "Clear search",
        /** Said once typing pauses (S6). */
        found_zero: "No roadmaps match",
        found_one: "{{count, number}} roadmap matches",
        found_other: "{{count, number}} roadmaps match",
        /** In place of the families while nothing matches (S4). */
        noMatch: "No roadmaps match “{{query}}”",
        /** Said once the search is cleared (S5). */
        showingAll: "Showing all roadmaps",
      },
    },
    /** A roadmap whose own family or category differs from the lists' (STY-027 S4, S8). */
    lists: {
      outOfStep: "Doesn't match its family or category",
      familyNotListed: "Family isn't listed",
      /** Fixing a roadmap whose copied family or category cells differ from the lists (STY-030). */
      match: {
        /** Beside a family the list doesn't have, which "Make it match" can't fix (S3). */
        chooseFamily: "Choose its family under About this roadmap.",
        action: "Make it match",
        confirm: {
          title: "Make {{title}} match its family and category?",
          description:
            "This roadmap is published. The public site shows the change after its next nightly update.",
          action: "Make it match",
        },
        notice: {
          matched: "{{title}} now matches its family and category",
          matchedPublic:
            "{{title}} now matches its family and category. The public site shows it after its next nightly update.",
          changed:
            "This roadmap changed while you were looking. Nothing was changed.",
          failed: "Couldn't make the roadmap match",
        },
      },
    },
    /** Adding a roadmap from the list, in the roadmap dialog (STY-041). */
    add: {
      /** The list's button, and the dialog's heading. */
      title: "Add a roadmap",
      submit: "Add roadmap",
      shortName: "Short name",
      titleHint: "The name the public site shows.",
      /** Under the short name, while it gives an address (S3). */
      addressHint:
        "Its public address will end “{{address}}”. It can't be changed here later.",
      /** In place of `addressHint`, until the short name gives an address. */
      shortNameHint:
        "It ends the roadmap's public address. It can't be changed here later.",
      note: "It starts not published, with no items. The public site doesn't show it until you publish it.",
      /** Why a field can't be sent, or was refused (S4, S6); a blank title is `roadmaps.edit.titleRequired`. */
      errors: {
        shortName: {
          blank: "Enter a short name",
          "invalid-character": "Use only letters, numbers, spaces and hyphens",
          "too-long": "Use {{max, number}} characters or fewer",
          "no-address": "Include a letter from a to z, or a number",
          taken: "This short name is already in use. Choose another.",
        } satisfies Record<ShortNameProblem | "taken", string>,
        notListed: {
          familyId: "This family is no longer listed. Choose another.",
          categoryId: "This category is no longer listed. Choose another.",
        } satisfies Record<RoadmapChoiceField, string>,
      },
      failed: {
        title: "Couldn't add the roadmap",
      },
      /** On the new roadmap's page (S5). */
      added: "{{title}} was added. It isn't published yet.",
    },
    /** A roadmap's facts, on its card and in "About this roadmap" while it is folded. */
    facts: {
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
        family: "Family",
        category: "Category",
        lastUpdated: "Last updated",
      },
      /** Unfolds the panel from its one line, and folds it again (STY-053 S6). */
      showMore: "Show more",
      showLess: "Show less",
      /** In place of the date, for a roadmap with none (STY-036 S1). */
      noDate: "No date",
    },
    /** A roadmap's placement navigation: the title row's menu and the links (STY-053). */
    jumpTo: {
      /** The menu button, before the page has reached a placement (D8). */
      menu: "Jump to",
      /** The menu button, naming the placement the page is in (S3). */
      current: "Jump to: {{name}}",
      /** Names the row of links under "About this roadmap". */
      links: "Horizons and sections",
      /**
       * A placement or the unplaced items, for screen readers: its name, how many items
       * it holds, and whether any has an unpublished change (S2).
       */
      target_zero: "{{name}}, no items",
      target_one: "{{name}}, {{count, number}} item",
      target_other: "{{name}}, {{count, number}} items",
      /** A placement with no items is still marked while its order is pending. */
      targetPending_zero: "{{name}}, no items, unpublished changes",
      targetPending_one:
        "{{name}}, {{count, number}} item, unpublished changes",
      targetPending_other:
        "{{name}}, {{count, number}} items, unpublished changes",
    },
    /** A roadmap's items, on its page. */
    items: {
      loading: "Loading roadmap items…",
      loadFailed: "Couldn't load this roadmap's items",
      refreshFailed: "Couldn't refresh this roadmap's items",
      /** In place of `errors.invalid-data`, which is about the roadmap list. */
      invalidData:
        "This roadmap's items aren't in the expected format in the spreadsheet. Ask the spreadsheet owner to check them.",
      /** A roadmap with none, in a panel that holds "Add an item" (STY-046 S8). */
      empty: {
        title: "No items yet",
        description: "Add what the product is doing now, next and later.",
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
      /**
       * The tag on an item added and not yet published, and what drops it; each is
       * followed by the item's title, for assistive technology (STY-046).
       */
      new: "New",
      remove: "Remove",
      titleRequired: "Enter a title",
      /** A new item with no horizon or section chosen (STY-046 S2). */
      placementRequired: "Choose a horizon or section",
      /** Read before an error message by assistive technology. */
      errorPrefix: "Error:",
      /** Each label says the field is the English, in Welsh (Welsh is not edited yet). */
      itemFields: {
        title: "Title",
        description: "Description",
        expectedOutcome: "Expected outcome",
        phase: "Phase",
        /** Not English text, so its Welsh label says nothing of English. */
        placement: "Horizon or section",
        tags: "Tags",
        /** Not English text either: short names and codes stay English. */
        organisationIds: "Organisations",
        details: "Details",
      } satisfies Record<EditableItemField, string>,
      /** One checkbox of the form's organisations: "Cardiff and Vale (CAVUHB)" (STY-034). */
      organisationChoice: "{{shortName}} ({{code}})",
      /**
       * Codes the item names that the organisation list doesn't hold, comma separated
       * ("CAVHB, Mars"): publishing a changed choice drops them (STY-034 S4).
       */
      unknownOrganisations_one:
        "{{codes}} isn't recognised. Changing the organisations will remove it.",
      unknownOrganisations_other:
        "{{codes}} aren't recognised. Changing the organisations will remove them.",
      /** What a form's Organisations field adds to `openingField` (STY-038). */
      organisations: {
        /** Follows the field's button, for assistive technology: "Change organisations". */
        subject: "organisations",
        /** In place of the chosen organisations' names, when none is chosen. */
        none: "No organisations",
      },
      /** An item's Tags field (STY-037); tags themselves stay as typed, in English. */
      tags: {
        /** Follows the field's button, for assistive technology: "Change tags". */
        subject: "tags",
        /** In place of the item's tags, when it has none. */
        none: "No tags",
        /** Names the list of the item's tags, for assistive technology. */
        onItem: "Tags on this item",
        /** Each followed by its tag, for assistive technology: "Rename Patients". */
        rename: "Rename",
        remove: "Remove",
        /** Names the field holding a tag's name while it is changed. */
        renameField: "Rename {{tag}}",
        /** Keeps the new name; followed by the tag, for assistive technology. */
        update: "Update",
        /** Keeps the old name: "Cancel renaming Patients", for assistive technology. */
        cancelRename: "Cancel",
        cancelRenameSubject: "renaming {{tag}}",
        /** Labels the field for a new tag. */
        add: "Add a tag",
        /** The button beside it: "Add tag", for assistive technology. */
        addButton: "Add",
        addButtonSubject: "tag",
        /** Heads the tags the roadmap's other items carry, each a button that adds it. */
        elsewhere: "Used elsewhere in this roadmap",
        /** One of them, for assistive technology; `count` is how many items carry it. */
        offer_one: "Add {{tag}}, on {{count, number}} other item",
        offer_other: "Add {{tag}}, on {{count, number}} other items",
        /** In their place, when none holds what is typed in "Add a tag". */
        noMatch: "No other tag matches “{{typed}}”.",
        /** Announced; `tags` are comma separated. */
        added: "Added {{tags}}.",
        removed: "Removed “{{tag}}”.",
        /** Beside `removed`: "Undo removing Patients", for assistive technology. */
        undoRemove: "Undo",
        undoRemoveSubject: "removing {{tag}}",
        /** Announced once a removal is undone. */
        putBack: "Put back “{{tag}}”.",
        /** What the field says when a tag is not kept as typed. */
        notes: {
          /** `tag` is the item's own, which `typed` repeats, whatever its capitals. */
          repeat: "“{{tag}}” is already on this item.",
          /** A typed tag takes the roadmap's spelling (STY-037 S21). */
          respelt: "Added as “{{tag}}”, as other items spell it.",
          respeltRename: "Renamed to “{{tag}}”, as other items spell it.",
          /** The tag `typed` was renamed to `tag`, which the item has (STY-037 S6). */
          merged:
            "“{{tag}}” is already on this item, so “{{typed}}” was removed.",
        },
        /** Under the tags of an item that has Welsh tags, in place of the button (S20). */
        welshLocked:
          "These tags have Welsh versions, so they can't be changed here yet.",
      },
      /** An item's Details field (STY-039); details themselves stay as typed, in English. */
      details: {
        /** Follows the field's button, for assistive technology: "Change details". */
        subject: "details",
        /** In place of the item's details, when it has none. */
        none: "No details",
        /** Under the field's label, shut or open. */
        hint: "The public site lists these under “What this covers”.",
        /** Under the open list. */
        keys: "Press Enter for a new detail. To nest one, start it with a hyphen.",
        /** Names a detail's text, for assistive technology: its place and level (S24). */
        name: {
          top: "Detail {{position}} of {{total}}, top level",
          nested: "Detail {{position}} of {{total}}, nested under “{{parent}}”",
        },
        /** Names the buttons under the list, which act on the detail being written. */
        selected: "The detail selected",
        /** Each followed by that detail, for assistive technology: "Move in Dermatology". */
        actions: {
          moveOut: "Move out",
          moveIn: "Move in",
          moveUp: "Move up",
          moveDown: "Move down",
          remove: "Remove",
        },
        /** Follows a button's word when the detail has no text yet. */
        emptySubject: "the empty detail",
        /** Why a button can't act on the detail (S3, S23). */
        refused: {
          first: "The first detail has nothing above it to nest under.",
          nested: "It is already nested under the detail above.",
          deepest: "A list has three levels, so this can't go deeper.",
          top: "It is already at the top level.",
          firstAtLevel: "It is already the first at its level.",
          lastAtLevel: "It is already the last at its level.",
          nothing: "There is no detail to remove.",
        },
        /** Announced; `parent` is the detail it is now nested under. */
        said: {
          movedIn: "Moved in, under “{{parent}}”.",
          movedOutTop: "Moved out, to the top level.",
          movedOutUnder: "Moved out, under “{{parent}}”.",
          newTop: "New detail at the top level.",
          newUnder: "New detail under “{{parent}}”.",
          movedUp: "Moved up.",
          movedDown: "Moved down.",
          joined: "Joined to the detail above.",
          removedEmpty: "Removed the empty detail.",
          /** Lines pasted, each a detail. */
          added_one: "Added {{count, number}} detail.",
          added_other: "Added {{count, number}} details.",
          removed: "Removed “{{detail}}”.",
          /** Follows `removed`, when details were nested under the one removed (S25). */
          nestedMoved_one: "The detail under it moved up a level.",
          nestedMoved_other:
            "The {{count, number}} details under it moved up a level.",
          /** Once a removal is undone. */
          putBack: "Put back “{{detail}}”.",
        },
        /** Beside `removed`: "Undo removing Dermatology", for assistive technology. */
        undoRemove: "Undo",
        undoRemoveSubject: "removing {{detail}}",
        /** Under the details of an item that has Welsh details, in place of the button (S18). */
        welshLocked:
          "These details have Welsh versions, so they can't be changed here yet.",
      },
      /**
       * The button of a field that opens on request (EPC-009): "Add" while the field
       * holds nothing, "Close" while it is open. Followed by the field's subject, for
       * assistive technology: "Change organisations".
       */
      openingField: {
        change: "Change",
        add: "Add",
        close: "Close",
      },
      /** Followed by the item's title, for assistive technology: "Move First item". */
      move: "Move",
      /** Heads the list of places an item can move to. */
      moveTo: "Move to",
      /** A placement's order, changed from an item's Move menu (STY-050). */
      order: {
        /** Heads the Move menu's choices of position: "In Now: 4 of 4". */
        position: "In {{placement}}: {{position, number}} of {{count, number}}",
        toTop: "To the top",
        upOne: "Up one",
        downOne: "Down one",
        toBottom: "To the bottom",
        /** Said once an item has moved, with its new position. */
        moved: {
          top: "Moved to the top. {{position, number}} of {{count, number}}.",
          up: "Moved up. {{position, number}} of {{count, number}}.",
          down: "Moved down. {{position, number}} of {{count, number}}.",
          bottom:
            "Moved to the bottom. {{position, number}} of {{count, number}}.",
        },
        /** The tag beside a placement's heading, and its line in "What changes". */
        changed: "Order changed",
        /** Followed by the placement, for assistive technology: "Undo order Now". */
        undo: "Undo order",
        /** Said once a placement's order is undone. */
        undone: "Order of {{placement}} undone",
      },
      /** The form's placement choice for an unplaced item, until one is chosen. */
      choosePlacement: "Choose a horizon or section",
      /** Heads the item dialog while it edits an item (STY-044). */
      itemHeading: "Edit this item",
      /** The item dialog while it adds an item (STY-046). */
      addItem: {
        /** The page's button, an empty roadmap's, and the dialog's heading. */
        title: "Add an item",
        /** Keeps the item pending and closes the dialog. */
        submit: "Add item",
        /** Keeps it pending and empties the form for the next. */
        another: "Add and start another",
        /** Under the fields: the button that makes it public, or saves it. */
        note: {
          publish: "It stays unpublished until you choose “Publish changes”.",
          save: "It isn't saved until you choose “Save changes”.",
        },
        /** Announced in the dialog after "Add and start another". */
        added: "“{{title}}” was added.",
      },
      /** Heads the roadmap dialog while it edits what a roadmap is about (STY-043). */
      roadmapHeading: "Edit this roadmap",
      roadmapFields: {
        title: "Title",
        statusLabel: "Status",
        productLead: "Product lead",
        vision: "Vision",
        serviceDescription: "Service description",
        familyId: "Family",
        categoryId: "Category",
        lastUpdated: "Last updated",
      } satisfies Record<EditableRoadmapField, string>,
      /** Fills a date field with today's date (STY-036 S3). */
      today: "Today",
      /** A date field holding a date after today (STY-036 S4). */
      dateInFuture: "Enter today's date or an earlier one",
      /** A date field the browser couldn't read as a date, such as one half typed. */
      dateInvalid: "Enter a real date, or clear the field",
      /** The choices that leave a roadmap in no family or category (STY-028). */
      noFamily: "No family",
      noCategory: "No category",
      /** A family the roadmap's row names that the family list doesn't have. */
      familyNotListed: "{{name}} (not listed)",
      /** In place of a choice, when its list can't be read (STY-028 S6). */
      choiceUnavailable: {
        familyId: "The family can't be changed right now.",
        categoryId: "The category can't be changed right now.",
      } satisfies Record<RoadmapChoiceField, string>,
    },
    /** Publishing or unpublishing a roadmap from its page, written at once (STY-035). */
    publishRoadmap: {
      action: {
        publish: "Publish roadmap",
        unpublish: "Unpublish roadmap",
      },
      confirm: {
        title: {
          publish: "Publish {{title}}?",
          unpublish: "Unpublish {{title}}?",
        },
        note: {
          publish: "It shows on the public site after its next nightly update.",
          unpublish: "It leaves the public site after its next nightly update.",
        },
        /** Publishing a roadmap with no item in a horizon or section (STY-042 S3). */
        noItems: "The public site will show it with no items.",
        /** Publishing a roadmap with pending edits, which go with it (S5). */
        withChanges_one: "Your unsaved change goes public with it.",
        withChanges_other:
          "Your {{count, number}} unsaved changes go public with it.",
        /** Unpublishing a roadmap with pending edits, which stay pending (S7). */
        keepsChanges_one: "Your unpublished change stays, to save later.",
        keepsChanges_other:
          "Your {{count, number}} unpublished changes stay, to save later.",
        saveAndPublish: "Save and publish",
      },
      notice: {
        published:
          "{{title}} is published. The public site shows it after its next nightly update.",
        savedAndPublished:
          "Changes saved and {{title}} published. The public site shows it after its next nightly update.",
        unpublished:
          "{{title}} is unpublished. It leaves the public site after its next nightly update.",
        changed:
          "This roadmap changed while you were looking. Nothing was changed.",
        failed: {
          publish: "Couldn't publish {{title}}",
          unpublish: "Couldn't unpublish {{title}}",
        },
        /** Publishing refused, as the public site's nightly update would fail (S4). */
        refused: {
          description:
            "Publishing it would stop the public site updating. Fix the spreadsheet, then publish again.",
          problems: {
            itemsMissing:
              "No tab is called “{{location}}”, the name in its Sheet cell.",
            titleMissing: "The “{{location}}” tab has no Title column.",
            placementMissing: "The “{{location}}” tab has no Horizon column.",
            shortColour:
              "Its colour {{colour}} has 3 digits. Write it with 6, like {{long}}.",
            idTaken:
              "“{{title}}” is published with the same web address. Unpublish it, or change one of their Sheet cells.",
          },
        },
      },
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
      /** The buttons' names, and the publish dialog's and the review's buttons. */
      action: {
        publish: "Publish changes",
        save: "Save changes",
      },
      /** The name of the foot bar's Discard. */
      discardAll: "Discard all changes",
      /**
       * The foot bar's short labels (STY-052 D11): each is the start of its name,
       * `action.*` or `discardAll`, so a spoken command finds it.
       */
      bar: {
        publish: "Publish",
        save: "Save",
        discard: "Discard",
      },
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
        /** Lists what changes, by roadmap section or item title, new items last. */
        changes: "What changes",
        /** Under the title of an item that is new, in place of its changed fields. */
        newItem: "New item",
      },
      /**
       * The tick box that sets the roadmap's `Last updated` to today in the same write,
       * here and on "Publish roadmap" (STY-036 S6).
       */
      markUpdated: "Mark as updated today",
      notice: {
        published:
          "Changes published. The public site shows them after its next nightly update.",
        saved: "Changes saved",
        failed: {
          publish: "Couldn't publish your changes",
          save: "Couldn't save your changes",
        },
        /** After a failed publish or save: nothing pending is lost. */
        kept: "Your changes are kept in this tab.",
        /** A publish stopped by someone else's changes, reviewed field by field. */
        refused: {
          /** While any field or order is still to decide. */
          title: "Someone else has changed this roadmap too",
          /** Once every field is decided, while removed items are still reported. */
          partialTitle: "Some changes couldn't be kept",
          nothing: {
            publish: "Nothing was published.",
            save: "Nothing was saved.",
          },
          choose: {
            publish: "Choose which to keep for each, then publish again.",
            save: "Choose which to keep for each, then save again.",
          },
          /** A field to decide: "First item: Title", or "About this roadmap: Vision". */
          target: "{{subject}}: {{field}}",
          yours: "Your change",
          theirs: "Current text",
          /** A placement's order to decide, as its field: "Now: Order" (STY-050). */
          orderField: "Order",
          /** Heads the order "Keep mine" would publish, then the one found. */
          yourOrder: "Your order",
          currentOrder: "Current order",
          /** In place of a value that is blank. */
          empty: "No text",
          /** Followed by the field, for assistive technology. */
          keepMine: "Keep mine",
          /** Followed by the field, for assistive technology. */
          useTheirs: "Use theirs",
          /**
           * In place of the choice, for tags that gained Welsh versions after they were
           * edited (STY-037 S22): the change can only be given up.
           */
          welshTags:
            "These tags now have Welsh versions, so they can't be changed here yet.",
          /** The same, of an item's details (STY-039 S19). */
          welshDetails:
            "These details now have Welsh versions, so they can't be changed here yet.",
          /** Followed by the field, for assistive technology. */
          discardMine: "Discard my change",
          /** `title` is the item's title as it was loaded. */
          removed:
            "Someone else has removed or changed “{{title}}”, so your changes to it couldn't be kept.",
          otherKept: "Your other changes are kept in this tab.",
          /** Opens the review in a dialog, from the notice at the foot (STY-052 D12). */
          review: "Review the changes",
          /** In the review, once every field is decided and changes are left (D16). */
          decided: {
            publish: "Every change is decided. Publish when you're ready.",
            save: "Every change is decided. Save when you're ready.",
          },
          /** In the review, once every field is decided and nothing is left (D22). */
          nothingLeft: {
            publish: "Every change is decided. Nothing is left to publish.",
            save: "Every change is decided. Nothing is left to save.",
          },
        },
      },
    },
    /** Why a write failed, for every surface that writes (CHO-004). `action` is `writeFailure.action.*`. */
    writeFailure: {
      /** What the account isn't allowed to do, in `forbidden`. */
      action: {
        lists: "change roadmaps",
        publish: "change this roadmap",
        families: "change families",
        add: "add roadmaps",
      },
      unauthenticated: "Your session has expired. Reconnect, then try again.",
      forbidden:
        "This Google account isn't allowed to {{action}}. Ask the spreadsheet owner for edit access.",
      /** The account may edit the spreadsheet, but not a part the write changes (STY-051 S7). */
      protected:
        "Part of the spreadsheet is protected, so nothing was changed. Ask its owner to let this account edit it.",
      "not-found":
        "The spreadsheet couldn't be found. Check that it still exists.",
      "rate-limited":
        "Too many requests right now. Wait a moment and try again.",
      network:
        "Couldn't connect. Check your internet connection and try again.",
      "invalid-response": "The answer was in an unexpected format.",
      "invalid-data":
        "The family list isn't in the expected format in the spreadsheet. Ask the spreadsheet owner to check it.",
      unknown: "Something went wrong. Please try again.",
      /** In place of the above, where the wording differs beyond what is changed. */
      publish: {
        "not-found": "This roadmap is no longer listed.",
        "invalid-data":
          "This roadmap isn't in the expected format in the spreadsheet. Ask the spreadsheet owner to check it.",
      },
      add: {
        unauthenticated:
          "Your session expired before it could be added. Try again.",
        "invalid-data":
          "The template for new roadmaps is missing or isn't in the expected format in the spreadsheet. Ask the spreadsheet owner to check it.",
      },
    },
    /** The page listing the families, categories and organisations (STY-029, STY-033), linked from the list. */
    families: {
      title: "Families, categories and organisations",
      description:
        "The product families and categories that group your roadmaps, and the organisations your items can be for.",
      connectPrompt:
        "Connect Google to view the families, categories and organisations.",
      loading: "Loading families, categories and organisations…",
      loadFailed: "Couldn't load the families, categories and organisations",
      refreshFailed:
        "Couldn't refresh the families, categories and organisations",
      heading: "Families",
      /** Under a family's name. */
      welshName: "Welsh: {{name}}",
      noWelshName: "No Welsh name",
      noRoadmaps: "No roadmaps",
      /** Beside a published roadmap, in the confirmation. */
      published: "Published",
      /** Followed by the family's name, for assistive technology. */
      change: "Change",
      add: "Add a family",
      /** In place of the families and Add, without a usable list (S7). */
      unavailable: {
        title: "Families can't be changed right now",
        description:
          "The spreadsheet's Families tab is missing or isn't in the expected format. Ask the spreadsheet owner to check it.",
      },
      form: {
        changeTitle: "Change {{name}}",
        name: "Name",
        colour: "Colour",
        colourHint: "A hex colour, like #00796b.",
        add: "Add family",
        save: "Save changes",
        errors: {
          blank: "Enter a name",
          taken: "Another family has this name",
          invalid: "Enter a colour like #00796b",
        },
      },
      /** Asked before a change that rewrites roadmaps (S3). */
      confirm: {
        title: "Change {{name}} on its roadmaps?",
        roadmaps_zero: "It has no roadmaps now.",
        roadmaps_one: "This changes {{count, number}} roadmap:",
        roadmaps_other: "This changes all {{count, number}} roadmaps:",
        public:
          "Published roadmaps show the change on the public site after its next nightly update.",
        notPublic: "None of them is published, so nothing will be public.",
        /** When a re-read found different roadmaps in the family (S8). */
        membersChanged:
          "The roadmaps in this family have changed. Check them again.",
        action: "Change family",
      },
      /** A change stopped by someone else's (S5). */
      refused: {
        title: "Someone else has changed this family",
        description:
          "Nothing was saved. Choose which to keep for each, then save again.",
        yours: "Your change",
        theirs: "Current value",
        keepMine: "Keep mine",
        useTheirs: "Use theirs",
      },
      notice: {
        added: "{{name}} added",
        changed: "{{name}} changed",
        changedPublic:
          "{{name}} changed. The public site shows it after its next nightly update.",
        gone: "This family is no longer listed, so your change wasn't saved.",
        failed: {
          add: "Couldn't add the family",
          change: "Couldn't change the family",
        },
      },
      categories: {
        heading: "Categories",
        description: "Categories can't be changed here yet.",
        none: "No categories are listed.",
      },
      /** The organisations, read-only (STY-033); each entry reads "Full name (CODE)". */
      organisations: {
        heading: "Organisations",
        description: "Organisations can't be changed here yet.",
        entry: "{{name}} ({{code}})",
        none: "No organisations are listed.",
      },
    },
    /**
     * A write the app couldn't read back holds the whole app until a Refresh reads it
     * (DEF-015): `landed` once it was written, `lost` once its answer was lost.
     */
    hold: {
      title: {
        landed: {
          publish: "Your changes were published",
          save: "Your changes were saved",
          published: "This roadmap was published",
          unpublished: "This roadmap was unpublished",
          added: "The roadmap was added",
          family: "The family was saved",
          matched: "The roadmap now matches its family and category",
        },
        lost: {
          publish: "Your changes may have been published",
          save: "Your changes may have been saved",
          published: "This roadmap may have been published",
          unpublished: "This roadmap may have been unpublished",
          added: "The roadmap may have been added",
          family: "The family may have been saved",
          matched: "The roadmap may now match its family and category",
        },
      },
      description: {
        landed:
          "This page couldn't be updated to show it. Refresh before you carry on.",
        lost: "The answer was lost. Refresh to check before you carry on.",
      },
      reconnect: "Reconnect to refresh your roadmaps.",
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
    protected:
      "Part of the spreadsheet is protected, so nothing was changed. Ask its owner to let this account edit it.",
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
