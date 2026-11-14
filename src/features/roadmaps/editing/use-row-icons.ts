import { useLayoutEffect, useState } from "react"

/** The gap between a row's tag and its buttons, in pixels (`gap-2`). */
const ROW_GAP = 8

/**
 * Whether the rows' buttons show as icons (S16, D10): when any tag, at its own width,
 * is too wide to sit beside the buttons in words, so every row looks alike and no
 * button drops under its tag. Measured from the list's `RowProbe` whenever the tags or
 * the list's width change; words where nothing can be measured.
 */
export function useRowIcons(
  rows: { readonly current: HTMLUListElement | null },
  tags: readonly string[],
): boolean {
  const [icons, setIcons] = useState(false)
  useLayoutEffect(() => {
    const list = rows.current
    const probe = list?.querySelector("[data-tag-probe]")
    if (!list || !probe || typeof ResizeObserver === "undefined") return
    const fit = () => {
      const room = list.clientWidth
      if (room === 0) return
      const [buttons = 0, ...names] = [...probe.children].map((part) =>
        Math.ceil(part.getBoundingClientRect().width),
      )
      setIcons(names.some((name) => name + ROW_GAP + buttons > room))
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(list)
    return () => {
      observer.disconnect()
    }
  }, [rows, tags])
  return icons
}
