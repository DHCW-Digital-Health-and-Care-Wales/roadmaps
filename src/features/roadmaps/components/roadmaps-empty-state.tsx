import { FolderOpenIcon } from "lucide-react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { StatusPanel } from "./status-panel"

export interface RoadmapsEmptyStateProps {
  /** What starts a first roadmap: "Add a roadmap" (STY-041 S1). */
  action: ReactNode
}

/** Shown when the list loaded but the data source lists no roadmaps. */
export function RoadmapsEmptyState({ action }: RoadmapsEmptyStateProps) {
  const { t } = useTranslation()
  return (
    <StatusPanel
      icon={<FolderOpenIcon />}
      title={t("roadmaps.empty.title")}
      description={t("roadmaps.empty.description")}
      action={action}
    />
  )
}
