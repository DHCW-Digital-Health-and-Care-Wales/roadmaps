import { EyeOffIcon, GlobeIcon } from "lucide-react"

import type { PublishedState } from "./use-published-state"

/**
 * What the action offers now, "Publish roadmap" or "Unpublish roadmap", with its icon:
 * a button in the title row, or an item in its More menu (STY-052 D6, D15, D19).
 */
export function publishedStateAction(state: PublishedState) {
  return state.publishing
    ? ({ verb: "publish", Icon: GlobeIcon } as const)
    : ({ verb: "unpublish", Icon: EyeOffIcon } as const)
}
