import { useQuery } from "@tanstack/react-query"
import { LockKeyholeIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { BackLink } from "@/components/layout/back-link"
import { Skeleton } from "@/components/ui/skeleton"
import { AuthButton } from "@/features/auth/components/auth-button"
import { useAuth } from "@/features/auth/use-auth"

import { RefreshButton } from "../components/refresh-button"
import { RoadmapsErrorState } from "../components/roadmaps-error-state"
import { StatusPanel } from "../components/status-panel"
import { CategoriesSection } from "../families/categories-section"
import { FamiliesSection } from "../families/families-section"
import { OrganisationsSection } from "../families/organisations-section"
import { useEnabledWhileConnected } from "../hooks/enabled-while-connected"
import {
  categoryListQueryOptions,
  familyListQueryOptions,
} from "../hooks/roadmap-queries"
import { useOrganisations } from "../hooks/use-organisations"
import { useRoadmaps } from "../hooks/use-roadmaps"
import { useRoadmapsProblem } from "../hooks/use-roadmaps-problem"
import { useRoadmapRepository } from "../roadmap-repository-context"

const TITLE_ID = "families-title"

/**
 * `/families`: each family with its colour, names and roadmaps, which anyone connected
 * can add to, rename or recolour, and the categories and organisations, read-only
 * (STY-029, STY-033). Handles not connected, loading and failure, as the roadmap list does.
 */
export function FamiliesPage() {
  const { t } = useTranslation()
  const repository = useRoadmapRepository()
  const connected = useAuth().state.status === "connected"
  const roadmaps = useRoadmaps()
  const families = useQuery(
    useEnabledWhileConnected(familyListQueryOptions(repository)),
  )
  const categories = useQuery(
    useEnabledWhileConnected(categoryListQueryOptions(repository)),
  )
  const organisations = useOrganisations()
  const queries = [roadmaps, families, categories, organisations]
  const fetching = queries.some(({ isFetching }) => isFetching)
  const problem = useRoadmapsProblem(
    queries.find(({ error }) => error !== null)?.error ?? null,
  )
  const reload = () => {
    for (const query of queries) void query.refetch()
  }

  const content = (() => {
    if (
      roadmaps.data !== undefined &&
      families.data !== undefined &&
      categories.data !== undefined &&
      organisations.data !== undefined
    ) {
      return (
        <>
          {problem && (
            <RoadmapsErrorState
              variant="alert"
              subject="families"
              error={problem}
              onRetry={reload}
              retrying={fetching}
            />
          )}
          <FamiliesSection
            families={families.data}
            roadmaps={roadmaps.data}
            available={connected}
          />
          <CategoriesSection categories={categories.data} />
          <OrganisationsSection organisations={organisations.data} />
        </>
      )
    }
    if (!connected && queries.every(({ data }) => data === undefined)) {
      return (
        <StatusPanel
          icon={<LockKeyholeIcon />}
          title={t("roadmaps.families.title")}
          description={t("roadmaps.families.connectPrompt")}
          action={<AuthButton />}
        />
      )
    }
    if (problem) {
      return (
        <RoadmapsErrorState
          variant="panel"
          subject="families"
          error={problem}
          onRetry={reload}
          retrying={fetching}
        />
      )
    }
    return (
      <div role="status">
        <span className="sr-only">{t("roadmaps.families.loading")}</span>
        <div aria-hidden="true" className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    )
  })()

  return (
    <section aria-labelledby={TITLE_ID}>
      <BackLink to="/">{t("roadmaps.detail.back")}</BackLink>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 id={TITLE_ID} className="text-heading-xl">
            {t("roadmaps.families.title")}
          </h1>
          <p className="text-pretty text-muted-foreground">
            {t("roadmaps.families.description")}
          </p>
        </div>
        <div className="shrink-0">
          <RefreshButton fetching={fetching} onRefresh={reload} />
        </div>
      </div>
      <div className="mt-8 flex flex-col gap-10">{content}</div>
    </section>
  )
}
