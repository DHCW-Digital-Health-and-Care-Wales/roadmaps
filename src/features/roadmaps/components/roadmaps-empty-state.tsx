import { FolderOpenIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { StatusPanel } from "./status-panel"

/** Shown when the list loaded but the data source lists no roadmaps. */
export function RoadmapsEmptyState() {
  const { t } = useTranslation()
  return (
    <StatusPanel
      icon={<FolderOpenIcon />}
      title={t("roadmaps.empty.title")}
      description={t("roadmaps.empty.description")}
    />
  )
}
