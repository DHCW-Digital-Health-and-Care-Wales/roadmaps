import { Link } from "@tanstack/react-router"
import { ArrowLeftIcon, LockKeyholeIcon, MapPinOffIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AuthButton } from "@/features/auth/components/auth-button"
import { useAuth } from "@/features/auth/use-auth"
import { cn } from "@/lib/utils"

import { RoadmapIcon } from "../components/roadmap-icon"
import { RoadmapsErrorState } from "../components/roadmaps-error-state"
import { StatusPanel } from "../components/status-panel"
import { useRoadmap } from "../hooks/use-roadmaps"
import { useRoadmapsProblem } from "../hooks/use-roadmaps-problem"

export interface RoadmapDetailPageProps {
  roadmapId: string
}

/**
 * `/roadmaps/$roadmapId`: the roadmap's name (details come later), found in the cached
 * or freshly loaded list. Handles not connected, loading, failure and unknown ids.
 */
export function RoadmapDetailPage({ roadmapId }: RoadmapDetailPageProps) {
  const { t } = useTranslation()

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      {/* Link semantics with button styling (Base UI's `render` would add role=button). */}
      <Link
        to="/"
        className={cn(
          buttonVariants({
            variant: "ghost",
            size: "sm",
            className: "-ml-2.5 text-muted-foreground",
          }),
        )}
      >
        <ArrowLeftIcon data-icon="inline-start" aria-hidden="true" />
        {t("roadmaps.detail.back")}
      </Link>
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
      <div className="flex flex-col gap-6">
        {/* Shown from cache: say so when it may be out of date. */}
        {problem && (
          <RoadmapsErrorState
            variant="alert"
            error={problem}
            onRetry={retry}
            retrying={isFetching}
          />
        )}
        <div className="flex items-start gap-4">
          <RoadmapIcon className="size-12 rounded-xl [&_svg]:size-6" />
          <div className="min-w-0 flex-1 pt-0.5">
            <h1 className="text-xl font-semibold tracking-tight text-pretty wrap-break-word sm:text-2xl">
              {roadmap.name}
            </h1>
            <p className="mt-1.5 text-muted-foreground">
              {t("roadmaps.detail.comingSoon")}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Missing from a list that is current: it really is gone (or hidden).
  if (roadmap === null && !problem) {
    return (
      <StatusPanel
        icon={<MapPinOffIcon />}
        title={t("roadmaps.detail.notFoundTitle")}
        titleAs="h1"
        description={t("roadmaps.detail.notFoundDescription")}
        action={
          <Link to="/" className={cn(buttonVariants({ variant: "outline" }))}>
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
    <div role="status" className="flex items-start gap-4">
      <span className="sr-only">{t("common.loading")}</span>
      <Skeleton aria-hidden="true" className="size-12 shrink-0 rounded-xl" />
      <div aria-hidden="true" className="flex flex-1 flex-col gap-3 pt-1.5">
        <Skeleton className="h-6 w-64 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
    </div>
  )
}
