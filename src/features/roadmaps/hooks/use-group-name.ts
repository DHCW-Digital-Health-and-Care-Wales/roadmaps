import { useCallback } from "react"
import { useTranslation } from "react-i18next"

import { localise } from "@/domain/roadmap/localised-text"
import { useLanguage } from "@/i18n"

import type { RoadmapGroup } from "../group-roadmaps"

/**
 * A group's name, as the roadmap list and the navigation show it: its family's in the
 * current language, or "No product family".
 */
export function useGroupName(): (group: RoadmapGroup) => string {
  const { t } = useTranslation()
  const language = useLanguage()
  return useCallback(
    ({ family }: RoadmapGroup) =>
      family ? localise(family, language) : t("roadmaps.noFamily"),
    [t, language],
  )
}
