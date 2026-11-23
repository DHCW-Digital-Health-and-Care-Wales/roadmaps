import type { Strings } from "../i18n"
import type { InfoPageId } from "./router"

/**
 * Accessibility statement (UK public sector sites need one) and privacy note
 * (no cookies, cookie-free Simple Analytics, self-hosted fonts, so nothing to
 * consent to), each on its own page: its heading and paragraphs from the
 * catalogue. The privacy note describes the analytics script in index.html.
 */
export const INFO_PAGES: Record<
  InfoPageId,
  (strings: Strings) => { heading: string; paragraphs: [string, ...string[]] }
> = {
  accessibility: ({ infoPages: { accessibility } }) => ({
    heading: accessibility.heading,
    paragraphs: [accessibility.target],
  }),
  privacy: ({ infoPages: { privacy } }) => ({
    heading: privacy.heading,
    paragraphs: [privacy.tracking, privacy.fonts],
  }),
}
