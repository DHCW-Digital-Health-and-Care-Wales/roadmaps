import { Link } from "@tanstack/react-router"
import { LockKeyholeIcon, MapPinOffIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { BackLink } from "@/components/layout/back-link"
import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { localise } from "@/domain/roadmap/localised-text"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { AuthButton } from "@/features/auth/components/auth-button"
import { useAuth } from "@/features/auth/use-auth"
import { useLanguage } from "@/i18n"
import type { AppError } from "@/lib/errors"
import { cn } from "@/lib/utils"

import { NotPublishedBadge } from "../components/not-published-badge"
import { RefreshButton } from "../components/refresh-button"
import { RoadmapItems, RoadmapItemsSkeleton } from "../components/roadmap-items"
import { RoadmapsErrorState } from "../components/roadmaps-error-state"
import { StatusPanel } from "../components/status-panel"
import { isRoadmapGone, useRoadmapItems } from "../hooks/use-roadmap-items"
import { useRoadmap } from "../hooks/use-roadmaps"
import { useRoadmapsProblem } from "../hooks/use-roadmaps-problem"

export interface RoadmapDetailPageProps {
  roadmapId: string
}

/**
 * `/roadmaps/$roadmapId`: the roadmap, found in the cached or freshly loaded list, with
 * its items. Handles not connected, loading, failure and unknown ids, for the list and
 * for the items.
 */
export function RoadmapDetailPage({ roadmapId }: RoadmapDetailPageProps) {
  const { t } = useTranslation()

  return (
    <section>
      <BackLink to="/">{t("roadmaps.detail.back")}</BackLink>
      <div className="mt-6">
        <RoadmapDetail roadmapId={roadmapId} />
      </div>
    </section>
  )
}

function RoadmapDetail({ roadmapId }: RoadmapDetailPageProps) {
  const { t } = useTranslation()
  const connected = useAuth().state.status === "connected"
  const { data: roadmap, error, isFetching, refetch } = useRoadmap(roadmapId)
  const problem = useRoadmapsProblem(error)
  const retry = () => {
    void refetch()
  }

  if (roadmap) {
    return (
      <RoadmapView
        roadmap={roadmap}
        listProblem={problem}
        listFetching={isFetching}
        refetchList={refetch}
      />
    )
  }

  // Missing from a list that is current: it really is gone (no longer listed).
  if (roadmap === null && !problem) {
    return (
      <StatusPanel
        icon={<MapPinOffIcon />}
        title={t("roadmaps.detail.notFoundTitle")}
        titleAs="h1"
        description={t("roadmaps.detail.notFoundDescription")}
        action={
          <Link to="/" className={cn(buttonVariants({ variant: "secondary" }))}>
            {t("roadmaps.detail.back")}
          </Link>
        }
      />
    )
  }

  // Nothing loaded with a session yet (e.g. opened from a bookmark): ask to connect.
  if (roadmap === undefined && !connected) {
    return (
      <StatusPanel
        icon={<LockKeyholeIcon />}
        title={t("roadmaps.detail.title")}
        titleAs="h1"
        description={t("roadmaps.detail.connectPrompt")}
        action={<AuthButton />}
      />
    )
  }

  if (problem) {
    return (
      <RoadmapsErrorState
        variant="panel"
        titleAs="h1"
        error={problem}
        onRetry={retry}
        retrying={isFetching}
      />
    )
  }

  return (
    <div role="status">
      <span className="sr-only">{t("common.loading")}</span>
      <div aria-hidden="true" className="flex flex-col gap-3 pt-1.5">
        <Skeleton className="h-6 w-64 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
    </div>
  )
}

interface RoadmapViewProps {
  roadmap: Roadmap
  /** Why the list the roadmap came from may be out of date, if it may. */
  listProblem: AppError | null
  listFetching: boolean
  refetchList: () => Promise<unknown>
}

/**
 * A listed roadmap: its title, a Not published badge when it is not public (D8), a
 * Refresh for the roadmap and its items (D7), then its items. The title stays whatever
 * happens to the items.
 */
function RoadmapView({
  roadmap,
  listProblem,
  listFetching,
  refetchList,
}: RoadmapViewProps) {
  const language = useLanguage()
  // The same query the items area reads, for the page's Refresh.
  const items = useRoadmapItems(roadmap.id)
  const retryList = () => {
    void refetchList()
  }
  const refresh = () => {
    void Promise.all([refetchList(), items.refetch()])
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-6">
        {/* Shown from cache: say so when it may be out of date. */}
        {listProblem && (
          <RoadmapsErrorState
            variant="alert"
            error={listProblem}
            onRetry={retryList}
            retrying={listFetching}
          />
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="text-heading-xl text-pretty wrap-break-word">
              {localise(roadmap.title, language)}
            </h1>
            {!roadmap.published && <NotPublishedBadge />}
          </div>
          <div className="shrink-0">
            <RefreshButton
              fetching={listFetching || items.isFetching}
              onRefresh={refresh}
            />
          </div>
        </div>
      </div>
      <RoadmapItemsArea roadmapId={roadmap.id} listFetching={listFetching} />
    </div>
  )
}

interface RoadmapItemsAreaProps {
  roadmapId: string
  /** The roadmap list is being read, as it is again once the roadmap is gone (D11). */
  listFetching: boolean
}

/**
 * The roadmap's items, or what stands in for them while they are read or can't be. An
 * expired session is the list's alert to show, once, above the title, with Reconnect;
 * the items read earlier stay.
 */
function RoadmapItemsArea({ roadmapId, listFetching }: RoadmapItemsAreaProps) {
  const { data: items, error, isFetching, refetch } = useRoadmapItems(roadmapId)
  const problem = useRoadmapsProblem(error)
  const expired = problem?.kind === "unauthenticated"
  // The list is read again and the page then says the roadmap is not found.
  const gone = isRoadmapGone(problem)
  const retry = () => {
    void refetch()
  }

  if (items) {
    return (
      <div className="flex flex-col gap-6">
        {problem && !expired && !gone && (
          <RoadmapsErrorState
            variant="alert"
            subject="items"
            error={problem}
            onRetry={retry}
            retrying={isFetching}
          />
        )}
        <RoadmapItems items={items} />
      </div>
    )
  }
  if (gone) return listFetching ? <RoadmapItemsSkeleton /> : null
  if (expired) return null
  if (problem) {
    return (
      <RoadmapsErrorState
        variant="panel"
        subject="items"
        error={problem}
        onRetry={retry}
        retrying={isFetching}
      />
    )
  }
  return <RoadmapItemsSkeleton />
}
