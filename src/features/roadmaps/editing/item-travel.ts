import { flushSync } from "react-dom"

import { REDUCED_MOTION } from "@/lib/use-media-query"

import type { PageItem } from "./page-items"

/**
 * How far a move from the Move menu takes its item: within its placement, about 0.4
 * seconds, or to another, about 0.7, the page scrolling with it (STY-072 S1, S2).
 * `globals.css` times each by the transition's type.
 */
export type TravelKind = "within" | "across"

const TRAVEL_TYPES = {
  within: "item-move",
  across: "item-move-across",
} as const satisfies Record<TravelKind, string>

/** Set on the document while items travel. */
const TRAVELLING = "data-travelling"

/** The travel last started, which alone clears `TRAVELLING` as it settles. */
let current: ViewTransition | null = null

/**
 * Makes a move from the Move menu, `update`, as a view transition: the moved item
 * travels from where it was to where it lands, the items it passes moving aside, then
 * shows its mark (STY-072, D6). The pending edits are read through
 * `useSyncExternalStore`, whose updates are sync, so React's own `ViewTransition`
 * never animates them: the browser's API runs `update` once it has drawn the page as it
 * was, and `flushSync` draws the move, focus and mark included, before it draws the
 * page as it is. A move made while another travels skips that one, which ends at once
 * where it lands, and plays from there (S3), as a press between the pinned bars does.
 * Where the system asks for reduced motion or the browser has no view transitions with
 * types, nothing travels: the move shows at once (S4).
 */
export function travel(kind: TravelKind, update: () => void): void {
  if (!canTravel()) {
    update()
    return
  }
  // `globals.css` hides a closing menu while items travel, keyed on this attribute
  // (its comment says why).
  const root = document.documentElement
  root.setAttribute(TRAVELLING, "")
  const transition = document.startViewTransition({
    update: () => {
      flushSync(update)
    },
    types: [TRAVEL_TYPES[kind]],
  })
  // The transition draws the room between the pinned bars as the items travel, so
  // nothing there takes a click or a tap: a press there ends this travel at once, and
  // the next reaches the page (D7).
  const press = (event: PointerEvent) => {
    if (event.target === root) transition.skipTransition()
  }
  document.addEventListener("pointerdown", press, { capture: true })
  current = transition
  const settled = () => {
    document.removeEventListener("pointerdown", press, { capture: true })
    // Its own only: the next travel may have begun before this one settles.
    if (current !== transition) return
    current = null
    root.removeAttribute(TRAVELLING)
  }
  transition.finished.then(settled, settled)
}

function canTravel(): boolean {
  return (
    "startViewTransition" in document &&
    "ViewTransition" in window &&
    "types" in ViewTransition.prototype &&
    !window.matchMedia(REDUCED_MOTION).matches
  )
}

/**
 * The view transition name of each page item, by card key, that the two ends of its
 * travel pair by, as it is drawn anew in another list: from its ID, or a new item's,
 * never its card key, which an item without an ID keys by its position and text. An
 * item without an ID, or whose ID another item has too, has none, so it shows at once in
 * its new place (STY-072).
 */
export function travelNames(
  pageItems: readonly PageItem[],
): ReadonlyMap<string, string> {
  const named = pageItems.flatMap(({ key, item, newItemId }) => {
    const name =
      newItemId !== undefined
        ? travelName("new", newItemId)
        : item.id !== null && travelName("item", item.id)
    return name ? [{ key, name }] : []
  })
  const counts = new Map<string, number>()
  for (const { name } of named) counts.set(name, (counts.get(name) ?? 0) + 1)
  return new Map(
    named.flatMap(({ key, name }) =>
      counts.get(name) === 1 ? [[key, name] as const] : [],
    ),
  )
}

/**
 * A CSS identifier for `id`, distinct for each: every character but an ASCII letter,
 * digit or hyphen is written as its code point between underscores, so "Tŷ" is
 * "T_177_" and an underscore is "_5f_".
 */
function travelName(prefix: string, id: string): string {
  const escaped = Array.from(id, (character) =>
    /[A-Za-z0-9-]/.test(character)
      ? character
      : `_${(character.codePointAt(0) ?? 0).toString(16)}_`,
  ).join("")
  return `${prefix}-${escaped}`
}
