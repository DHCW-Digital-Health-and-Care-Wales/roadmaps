import { useCallback } from "react"
import { useTranslation } from "react-i18next"

import type { RoadmapGroup } from "../group-roadmaps"
import type { ShownContent } from "../shown-content"
import { useContent } from "./use-content"

/**
 * A group's name, as the roadmap list and the navigation show it: its family's in the
 * current language, marked where it is English in Welsh, or "No product family".
 */
export function useGroupName(): (group: RoadmapGroup) => ShownContent {
  const { t } = useTranslation()
  const content = useContent()
  return useCallback(
    ({ family }: RoadmapGroup) =>
      family
        ? content(family)
        : { text: t("roadmaps.noFamily"), lang: undefined },
    [t, content],
  )
}
