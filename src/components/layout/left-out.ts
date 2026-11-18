/**
 * Marks a part the slim header leaves out, visually hidden but still reachable: reached
 * by Tab or a screen reader while stuck, it scrolls the page back to the header's place,
 * so the header lets go and shows it there.
 */
export const LEFT_OUT = { "data-left-out": "" } as const

/** Finds a part marked `LEFT_OUT`. */
export const LEFT_OUT_SELECTOR = "[data-left-out]"
