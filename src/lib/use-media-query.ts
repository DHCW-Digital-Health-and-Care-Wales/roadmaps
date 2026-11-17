import { useCallback, useSyncExternalStore } from "react"

/** Tailwind's `sm` as a media query: a viewport wider than a phone's. */
export const WIDER_THAN_A_PHONE = "(min-width: 40rem)"

/** Whether the viewport matches a media `query`, following it as the viewport changes. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener("change", onChange)
      return () => {
        list.removeEventListener("change", onChange)
      }
    },
    [query],
  )
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches)
}
