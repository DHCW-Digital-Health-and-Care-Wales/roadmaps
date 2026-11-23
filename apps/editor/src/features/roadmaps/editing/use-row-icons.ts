import type { RefObject } from "react"

import { useMeasure } from "@/lib/use-measure"

/** The gap between a row's tag and its buttons, in pixels (`gap-2`). */
const ROW_GAP = 8

/** Whether a tag in the list's `RowProbe` is too wide to sit beside the buttons. */
function rowsNeedIcons(list: HTMLElement): boolean {
  const room = list.clientWidth
  const probe = list.querySelector("[data-tag-probe]")
  if (room === 0 || !probe) return false
  const [buttons = 0, ...names] = [...probe.children].map((part) =>
    Math.ceil(part.getBoundingClientRect().width),
  )
  return names.some((name) => name + ROW_GAP + buttons > room)
}

/**
 * Whether the rows' buttons show as icons (S16, D10): when any tag, at its own width,
 * is too wide to sit beside the buttons in words, so every row looks alike and no
 * button drops under its tag. Measured from the list's `RowProbe` whenever the tags,
 * the list's width or the fonts change; words where nothing can be measured.
 */
export function useRowIcons(
  rowsRef: RefObject<HTMLUListElement | null>,
  tags: readonly string[],
): boolean {
  return useMeasure(rowsRef, tags.join("\n"), rowsNeedIcons, false)
}
