import { PlusIcon } from "lucide-react"
import { useRef, useState, type Ref } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { useSessionAction } from "@/features/auth/session-action"

import { RefreshButton } from "../components/refresh-button"
import { RoadmapGroups } from "../components/roadmap-groups"
import { RoadmapGridSkeleton } from "../components/roadmap-grid-skeleton"
import { RoadmapsEmptyState } from "../components/roadmaps-empty-state"
import { RoadmapsErrorState } from "../components/roadmaps-error-state"
import { RoadmapDialog } from "../dialogs/roadmap-dialog"
import { JOIN_READ } from "../hooks/roadmap-queries"
import { useOpenAddedRoadmap } from "../hooks/use-added-roadmap"
import { useRoadmaps } from "../hooks/use-roadmaps"
import { useRoadmapsProblem } from "../hooks/use-roadmaps-problem"

const TITLE_ID = "roadmaps-title"

/**
 * The home page once there is (or was) a session: the roadmaps with loading, empty,
 * error and expired states under a title, the count, then "Add a roadmap" (once the list
 * has loaded; it opens the roadmap dialog and then the roadmap it added, STY-041) and
 * Refresh on one row (STY-058). While expired, roadmaps loaded earlier
 * stay visible under a Reconnect prompt and nothing refetches until the user reconnects;
 * Refresh and "Add a roadmap" ask to reconnect first, then carry on (STY-057).
 */
export function RoadmapsPage() {
  const { t } = useTranslation()
  const { data: roadmaps, error, isFetching, refetch } = useRoadmaps()
  const [adding, setAdding] = useState(false)
  // The "Add a roadmap" button clicked, of the two an empty list shows: where focus
  // returns as the dialog closes (DEF-008). The one beside Refresh stands in for the
  // panel's, which a read can remove while the dialog is open.
  const clickedRef = useRef<HTMLElement | null>(null)
  const toolbarAddRef = useRef<HTMLButtonElement>(null)
  // Read when the dialog restores focus, after its closing animation: a read that lands
  // meanwhile can remove the button that was clicked.
  const opener = {
    get current() {
      return clickedRef.current?.isConnected
        ? clickedRef.current
        : toolbarAddRef.current
    },
  }
  const openAdded = useOpenAddedRoadmap()

  const unpublished =
    roadmaps?.filter(({ published }) => !published).length ?? 0

  const problem = useRoadmapsProblem(error)
  const reload = () => {
    void refetch(JOIN_READ)
  }
  const add = useSessionAction(() => {
    setAdding(true)
  })
  const addButton = (ref?: Ref<HTMLButtonElement>) =>
    roadmaps && (
      <Button
        ref={ref}
        onClick={(event) => {
          clickedRef.current = event.currentTarget
          add(event.currentTarget)
        }}
      >
        <PlusIcon data-icon="inline-start" aria-hidden="true" />
        {t("roadmaps.add.title")}
      </Button>
    )

  return (
    <section aria-labelledby={TITLE_ID}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 id={TITLE_ID} className="text-heading-xl">
            {t("roadmaps.title")}
          </h1>
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
        </div>
        {/* Wraps before the page would scroll sideways: the Welsh is the longer. */}
        <div className="flex flex-wrap items-center gap-3">
          {addButton(toolbarAddRef)}
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
            setAdding(false)
          }}
        />
      )}
    </section>
  )
}
