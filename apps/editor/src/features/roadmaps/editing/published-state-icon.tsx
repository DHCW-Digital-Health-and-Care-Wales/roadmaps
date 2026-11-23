import { EyeOffIcon, GlobeIcon, type LucideProps } from "lucide-react"

import type { publishedStateAction } from "./published-state-action"

const ICONS = { publish: GlobeIcon, unpublish: EyeOffIcon }

/** The icon of a `publishedStateAction`: the globe to publish, the crossed eye to unpublish. */
export function PublishedStateIcon({
  action,
  ...props
}: LucideProps & { action: ReturnType<typeof publishedStateAction> }) {
  const Icon = ICONS[action]
  return <Icon {...props} />
}
