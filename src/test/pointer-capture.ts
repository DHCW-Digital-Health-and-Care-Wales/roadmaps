import { onTestFinished, vi } from "vitest"

/**
 * Gives jsdom the pointer capture it lacks, until the test ends, so a test can press and
 * drag a control that captures its pointer (test code only).
 */
export function stubPointerCapture(): void {
  Element.prototype.setPointerCapture = vi.fn()
  onTestFinished(() => {
    // @ts-expect-error -- jsdom has none: put it back as it was
    delete Element.prototype.setPointerCapture
  })
}
