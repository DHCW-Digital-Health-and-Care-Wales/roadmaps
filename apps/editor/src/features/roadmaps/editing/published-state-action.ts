import type { PublishedState } from "./use-published-state"

/**
 * What the action offers now, "Publish roadmap" or "Unpublish roadmap": a button beside
 * the Not published tag, or an item in the header's More menu (STY-052 D6, STY-059 S6,
 * D7). `PublishedStateIcon` draws its icon.
 */
export function publishedStateAction(state: PublishedState) {
  return state.publishing ? "publish" : "unpublish"
}
