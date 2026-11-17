import { Link } from "@tanstack/react-router"
import { LockKeyholeIcon, MapPinOffIcon } from "lucide-react"
import { useCallback, useRef } from "react"
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

import { AddItemButton } from "../components/add-item-button"
import { AddedRoadmapNotice } from "../components/added-roadmap-notice"
import { ListMismatchBadges } from "../components/list-mismatch-badges"
import { MatchListsAction } from "../components/match-lists-action"
import { NotPublishedBadge } from "../components/not-published-badge"
import { RefreshButton } from "../components/refresh-button"
import { RoadmapFamilyLine } from "../components/roadmap-family-line"
import {
  RoadmapItems,
  type RoadmapItemsProps,
  RoadmapItemsSkeleton,
} from "../components/roadmap-items"
import { RoadmapsErrorState } from "../components/roadmaps-error-state"
import { StatusPanel } from "../components/status-panel"
import { ChangedTag } from "../editing/edit-controls"
import { EditableRoadmapAbout } from "../editing/editable-roadmap-about"
import { usePageItems } from "../editing/page-items"
import {
  applyRoadmapChanges,
  hasChoiceChange,
} from "../editing/pending-changes"
import {
  usePendingChanges,
  useRoadmapChanges,
} from "../editing/pending-changes-context"
import { PublishedStateAction } from "../editing/published-state-action"
import { PublishedStateNotice } from "../editing/published-state-notice"
import { RoadmapPublishing } from "../editing/roadmap-publishing"
import { useItemDialog } from "../editing/use-item-dialog"
import { usePublishedState } from "../editing/use-published-state"
import { useAddedRoadmapNotice } from "../hooks/use-added-roadmap"
import { useOrganisations } from "../hooks/use-organisations"
import { isRoadmapGone, useRoadmapItems } from "../hooks/use-roadmap-items"
import { useRoadmapLists } from "../hooks/use-roadmap-lists"
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
  // Its pending changes went with it (STY-026 S6).
  const removed = usePendingChanges().removed.has(roadmapId)
  const retry = () => {
    void refetch()
  }

  if (roadmap && !removed) {
    return (
      <RoadmapView
        // The view's state (dialog, outcome notice) is one roadmap's: another starts afresh.
        key={roadmap.id}
        roadmap={roadmap}
        listProblem={problem}
        listFetching={isFetching}
        refetchList={refetch}
      />
    )
  }

  // Missing from a list that is current, or found gone by a publish (even if the list
  // could not be read again after it): it really is gone.
  if ((roadmap === null && !problem) || removed) {
    return (
      <StatusPanel
        icon={<MapPinOffIcon />}
        title={t("roadmaps.detail.notFoundTitle")}
        titleAs="h1"
        description={t(
          removed
            ? "roadmaps.detail.removedDescription"
            : "roadmaps.detail.notFoundDescription",
        )}
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
 * A listed roadmap: a notice when it was just added (STY-041 S5), its title, a Not
 * published badge when it is not public (D8), a badge when it is out of step with the
 * family or category list (STY-027 S4, S8), Publish roadmap or Unpublish roadmap
 * (STY-035), a Refresh for the roadmap, its items and the lists (D7) and "Add an item"
 * (STY-046 S1), its family and category as they will be published (STY-028 S1), its
 * pending changes with Publish, what it is about, then its items, each showing its
 * pending English (STY-025). The title stays whatever happens to the items. It holds
 * the page's one item dialog, which "Add an item" and each item's Edit open.
 */
function RoadmapView({
  roadmap,
  listProblem,
  listFetching,
  refetchList,
}: RoadmapViewProps) {
  const language = useLanguage()
  const changes = useRoadmapChanges(roadmap.id)
  // The same queries the items area and the form read, for the page's Refresh.
  const items = useRoadmapItems(roadmap.id)
  const organisations = useOrganisations()
  const lists = useRoadmapLists(hasChoiceChange(changes))
  const shown = applyRoadmapChanges(roadmap, changes, lists.lists)
  const publishedState = usePublishedState(roadmap, items.data)
  const pageItems = usePageItems(roadmap.id, items.data)
  const addItemButton = useRef<HTMLButtonElement>(null)
  const itemDialog = useItemDialog({
    roadmap,
    items: items.data,
    organisations: organisations.data,
    pageItems,
    addItemButton,
  })
  // The page's own "Add an item" is always there, where a removed item's card is not.
  const focusAddItem = useCallback(() => {
    addItemButton.current?.focus()
  }, [])
  const addedNotice = useAddedRoadmapNotice(roadmap)
  const title = localise(shown.title, language)
  const retryList = () => {
    void refetchList()
  }
  const refresh = () => {
    // The lists, where any part of the page needs them, are read again too.
    void lists.refetch()
    void refetchList()
    void items.refetch()
    void organisations.refetch()
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
              {title}
            </h1>
            {!roadmap.published && <NotPublishedBadge />}
            <ListMismatchBadges roadmap={roadmap} />
            {changes?.roadmap.title && <ChangedTag />}
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <PublishedStateAction state={publishedState} title={title} />
            <RefreshButton
              fetching={
                listFetching || items.isFetching || organisations.isFetching
              }
              onRefresh={refresh}
            />
            <AddItemButton
              ref={addItemButton}
              disabled={!itemDialog.canAdd}
              onAdd={() => {
                itemDialog.add()
              }}
            />
          </div>
        </div>
        <RoadmapFamilyLine roadmap={shown} />
        <MatchListsAction roadmap={roadmap} />
        {addedNotice.shown && (
          <AddedRoadmapNotice title={title} onDismiss={addedNotice.dismiss} />
        )}
        {publishedState.notice && (
          <PublishedStateNotice
            notice={publishedState.notice}
            title={title}
            onDismiss={publishedState.dismissNotice}
          />
        )}
        <RoadmapPublishing roadmap={roadmap} pageItems={pageItems} />
      </div>
      <EditableRoadmapAbout roadmap={roadmap} />
      <RoadmapItemsArea
        roadmapId={roadmap.id}
        listFetching={listFetching}
        pageItems={pageItems}
        itemDialog={itemDialog}
        onItemRemoved={focusAddItem}
      />
    </div>
  )
}

interface RoadmapItemsAreaProps extends Pick<
  RoadmapItemsProps,
  "roadmapId" | "pageItems" | "itemDialog" | "onItemRemoved"
> {
  /** The roadmap list is being read, as it is again once the roadmap is gone (D11). */
  listFetching: boolean
}

/**
 * The roadmap's items, or what stands in for them while they are read or can't be. The
 * items show by the organisation list, so a read of either that can't be made is the
 * items' failure (ADR-014). An expired session is the list's alert to show, once, above
 * the title, with Reconnect; the items read earlier stay.
 */
function RoadmapItemsArea({
  roadmapId,
  listFetching,
  ...page
}: RoadmapItemsAreaProps) {
  const itemsRead = useRoadmapItems(roadmapId)
  const organisationsRead = useOrganisations()
  const { data: items } = itemsRead
  const { data: organisations } = organisationsRead
  const error = itemsRead.error ?? organisationsRead.error
  const isFetching = itemsRead.isFetching || organisationsRead.isFetching
  const problem = useRoadmapsProblem(error)
  const expired = problem?.kind === "unauthenticated"
  // The list is read again and the page then says the roadmap is not found.
  const gone = isRoadmapGone(itemsRead.error)
  const retry = () => {
    // Only the reads that failed: a good one has nothing to repeat.
    if (itemsRead.error) void itemsRead.refetch()
    if (organisationsRead.error) void organisationsRead.refetch()
  }

  if (items && organisations) {
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
        <RoadmapItems
          roadmapId={roadmapId}
          items={items}
          organisations={organisations}
          {...page}
        />
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
