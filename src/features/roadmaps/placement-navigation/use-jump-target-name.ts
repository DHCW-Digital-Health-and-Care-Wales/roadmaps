import { useTranslation } from "react-i18next"

import type { JumpTarget } from "./jump-targets"

/** Names a jump target by the heading it has on the page. */
export function useJumpTargetName(): (target: JumpTarget) => string {
  const { t } = useTranslation()
  return (target) =>
    target === "unplaced"
      ? t("roadmaps.items.unplaced.title")
      : t(`roadmaps.items.placements.${target}`)
}
