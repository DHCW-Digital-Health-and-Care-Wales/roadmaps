// Playwright's project filters (playwright.config.ts) read these tags: a test
// without one runs on desktop alone.
/** Also runs on mobile: what a phone changes (the menu button, the filter strip). */
export const BOTH = { tag: "@both" }
/** Runs on mobile alone: what only a phone has, or holds best (the menu, reflow). */
export const MOBILE_ONLY = { tag: "@mobile-only" }
