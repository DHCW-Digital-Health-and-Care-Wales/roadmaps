import { onTestFinished, vi } from "vitest"

/**
 * Makes `queries` match until the test ends, as on a screen they describe: jsdom's
 * `matchMedia` (`setup.ts`) matches none, so a test renders a phone unless it calls this,
 * e.g. `matchMediaQueries(DESKTOP_WIDTH)` (test code only).
 */
export function matchMediaQueries(...queries: string[]): void {
  const matchMedia = window.matchMedia.bind(window)
  const spy = vi
    .spyOn(window, "matchMedia")
    .mockImplementation((query) =>
      Object.assign(matchMedia(query), { matches: queries.includes(query) }),
    )
  onTestFinished(() => {
    spy.mockRestore()
  })
}
