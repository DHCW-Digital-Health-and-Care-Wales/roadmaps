import type { ParseKeys } from "i18next"
import type { InfoPageId } from "./router"

/**
 * Accessibility statement (UK public sector sites need one) and privacy note
 * (no cookies, cookie-free Simple Analytics, self-hosted fonts, so nothing to
 * consent to), each on its own page: catalogue keys for its heading and
 * paragraphs. The privacy note describes the analytics script in index.html.
 */
export const INFO_PAGES: Record<
  InfoPageId,
  { heading: ParseKeys; paragraphs: [ParseKeys, ...ParseKeys[]] }
> = {
  accessibility: {
    heading: "infoPages.accessibility.heading",
    paragraphs: ["infoPages.accessibility.target"],
  },
  privacy: {
    heading: "infoPages.privacy.heading",
    paragraphs: ["infoPages.privacy.tracking", "infoPages.privacy.fonts"],
  },
}
