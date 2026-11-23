import { EyeOffIcon, GlobeIcon, type LucideProps } from "lucide-react"

import type { PublishedState } from "./use-published-state"

/** The icon of `publishedStateAction`: the globe to publish, the crossed eye to unpublish. */
export function PublishedStateIcon({
  state,
  ...props
}: LucideProps & { state: PublishedState }) {
  const Icon = state.publishing ? GlobeIcon : EyeOffIcon
  return <Icon {...props} />
}
