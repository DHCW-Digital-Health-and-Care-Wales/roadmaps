import { Link } from "@tanstack/react-router"
import { PlusIcon } from "lucide-react"
import { useRef, useState, type Ref } from "react"
import { useTranslation } from "react-i18next"

import { textLinkClasses } from "@/components/layout/text-link-classes"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/use-auth"

import { RefreshButton } from "../components/refresh-button"
import { RoadmapGroups } from "../components/roadmap-groups"
import { RoadmapGridSkeleton } from "../components/roadmap-grid-skeleton"
import { RoadmapsEmptyState } from "../components/roadmaps-empty-state"
import { RoadmapsErrorState } from "../components/roadmaps-error-state"
import { RoadmapDialog } from "../dialogs/roadmap-dialog"
import { useOpenAddedRoadmap } from "../hooks/use-added-roadmap"
import { useRoadmaps } from "../hooks/use-roadmaps"
import { useRoadmapsProblem } from "../hooks/use-roadmaps-problem"

const TITLE_ID = "roadmaps-title"

/**
 * The home page once there is (or was) a session: the roadmaps with loading, empty,
 * error and expired states, a link to the families, categories and organisations
 * (STY-029), and "Add a roadmap" once the list has loaded, which opens the roadmap
 * dialog and then the roadmap it added (STY-041). While expired, roadmaps loaded earlier
 * stay visible under a Reconnect prompt, nothing refetches until the user reconnects,
 * and nothing can be added.
 */
export function RoadmapsPage() {
  const { t } = useTranslation()
  const { data: roadmaps, error, isFetching, refetch } = useRoadmaps()
  const connected = useAuth().state.status === "connected"
  const [adding, setAdding] = useState(false)
  // The "Add a roadmap" button clicked, of the two an empty list shows: where focus
  // returns as the dialog closes (DEF-008). The one beside Refresh stands in for the
  // panel's, which a read can remove while the dialog is open.
  const opener = useRef<HTMLElement | null>(null)
  const toolbarAdd = useRef<HTMLButtonElement>(null)
  const openAdded = useOpenAddedRoadmap()

  const unpublished =
    roadmaps?.filter(({ published }) => !published).length ?? 0

  const problem = useRoadmapsProblem(error)
  const reload = () => {
    void refetch()
  }
  const addButton = (ref?: Ref<HTMLButtonElement>) =>
    roadmaps && (
      <Button
        ref={ref}
        disabled={!connected}
        focusableWhenDisabled
        onClick={(event) => {
          opener.current = event.currentTarget
          setAdding(true)
        }}
      >
        <PlusIcon data-icon="inline-start" aria-hidden="true" />
        {t("roadmaps.add.title")}
      </Button>
    )

  return (
    <section aria-labelledby={TITLE_ID}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-1.5 lg:shrink-0">
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
        {/* Wraps before the page would scroll sideways: the Welsh is the longer. */}
        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
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
          {addButton(toolbarAdd)}
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
              <RoadmapsEmptyState action={addButton()} />
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
      {roadmaps && (
        <RoadmapDialog
          open={adding}
          opener={opener}
          roadmaps={roadmaps}
          onAdded={openAdded}
          onClose={() => {
            if (!opener.current?.isConnected)
              opener.current = toolbarAdd.current
            setAdding(false)
          }}
        />
      )}
    </section>
  )
}
