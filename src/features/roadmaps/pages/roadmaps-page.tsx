import { Link } from "@tanstack/react-router"
import { useTranslation } from "react-i18next"

import { textLinkClasses } from "@/components/layout/text-link-classes"

import { RefreshButton } from "../components/refresh-button"
import { RoadmapGroups } from "../components/roadmap-groups"
import { RoadmapGridSkeleton } from "../components/roadmap-grid-skeleton"
import { RoadmapsEmptyState } from "../components/roadmaps-empty-state"
import { RoadmapsErrorState } from "../components/roadmaps-error-state"
import { useRoadmaps } from "../hooks/use-roadmaps"
import { useRoadmapsProblem } from "../hooks/use-roadmaps-problem"

const TITLE_ID = "roadmaps-title"

/**
 * The home page once there is (or was) a session: the roadmaps with loading, empty,
 * error and expired states, and a link to the families and categories (STY-029). While expired, roadmaps loaded earlier stay visible under a
 * Reconnect prompt, and nothing refetches until the user reconnects.
 */
export function RoadmapsPage() {
  const { t } = useTranslation()
  const { data: roadmaps, error, isFetching, refetch } = useRoadmaps()

  const unpublished =
    roadmaps?.filter(({ published }) => !published).length ?? 0

  const problem = useRoadmapsProblem(error)
  const reload = () => {
    void refetch()
  }

  return (
    <section aria-labelledby={TITLE_ID}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 id={TITLE_ID} className="text-heading-xl">
            {t("roadmaps.title")}
          </h1>
          <p className="text-pretty text-muted-foreground">
            {t("roadmaps.description")}
          </p>
          <p>
            <Link to="/families" className={textLinkClasses}>
              {t("roadmaps.familiesLink")}
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {roadmaps && roadmaps.length > 0 && (
            <p className="text-body-xs text-muted-foreground tabular-nums">
              {unpublished > 0
                ? t("roadmaps.countWithUnpublished", {
                    total: roadmaps.length,
                    unpublished,
                  })
                : t("roadmaps.count", { count: roadmaps.length })}
            </p>
          )}
          <RefreshButton fetching={isFetching} onRefresh={reload} />
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-4">
        {roadmaps ? (
          <>
            {problem && (
              <RoadmapsErrorState
                variant="alert"
                error={problem}
                onRetry={reload}
                retrying={isFetching}
              />
            )}
            {roadmaps.length > 0 ? (
              <RoadmapGroups roadmaps={roadmaps} />
            ) : (
              <RoadmapsEmptyState />
            )}
          </>
        ) : problem ? (
          <RoadmapsErrorState
            variant="panel"
            error={problem}
            onRetry={reload}
            retrying={isFetching}
          />
        ) : (
          <RoadmapGridSkeleton />
        )}
      </div>
    </section>
  )
}
