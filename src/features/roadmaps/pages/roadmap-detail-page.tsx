import type { RefetchOptions } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { LockKeyholeIcon, MapPinOffIcon } from "lucide-react"
import { useCallback, useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"

import { buttonVariants } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { localise } from "@/domain/roadmap/localised-text"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { ConnectButton } from "@/features/auth/components/connect-button"
import { useAuth } from "@/features/auth/use-auth"
import { useLanguage } from "@/i18n"
import type { AppError } from "@/lib/errors"
import { cn } from "@/lib/utils"

import { AddedRoadmapNotice } from "../components/added-roadmap-notice"
import { MatchListsAction } from "../components/match-lists-action"
import { RoadmapHeader } from "../components/roadmap-header"
import {
  RoadmapItems,
  type RoadmapItemsProps,
  RoadmapItemsSkeleton,
} from "../components/roadmap-items"
import { RoadmapsErrorState } from "../components/roadmaps-error-state"
import { StatusPanel } from "../components/status-panel"
import { EditableRoadmapAbout } from "../editing/editable-roadmap-about"
import { groupPageItems, usePageItems } from "../editing/page-items"
import {
  applyRoadmapChanges,
  hasChoiceChange,
} from "../editing/pending-changes"
import {
  usePendingChanges,
  useRoadmapChanges,
} from "../editing/pending-changes-context"
import { PublishedStateDialog } from "../editing/published-state-dialog"
import { PublishedStateNotice } from "../editing/published-state-notice"
import { RoadmapPublishing } from "../editing/roadmap-publishing"
import { useItemDialog } from "../editing/use-item-dialog"
import { usePublishedState } from "../editing/use-published-state"
import { hasGroupedItems } from "../group-roadmap-items"
import { JOIN_READ } from "../hooks/roadmap-queries"
import { useAddedRoadmapNotice } from "../hooks/use-added-roadmap"
import { useOrganisations } from "../hooks/use-organisations"
import { isRoadmapGone, useRoadmapItems } from "../hooks/use-roadmap-items"
import { useRoadmapLists } from "../hooks/use-roadmap-lists"
import { useRoadmap } from "../hooks/use-roadmaps"
import { useRoadmapsProblem } from "../hooks/use-roadmaps-problem"
import { usePlacementNavigation } from "../placement-navigation/use-placement-navigation"

export interface RoadmapDetailPageProps {
  roadmapId: string
}

/**
 * `/roadmaps/$roadmapId`: the roadmap, found in the cached or freshly loaded list, with
 * its items. Handles not connected, loading, failure and unknown ids, for the list and
 * for the items.
 */
export function RoadmapDetailPage({ roadmapId }: RoadmapDetailPageProps) {
  return (
    <section>
      <RoadmapDetail roadmapId={roadmapId} />
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
        action={<ConnectButton />}
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
  refetchList: (options?: RefetchOptions) => Promise<unknown>
}

/**
 * A listed roadmap: its header block, with its facts, what it is about and its
 * controls, among them the placement navigation once its items are shown, which sticks
 * as the page scrolls (STY-052, STY-059, STY-060), a notice when it was just added
 * (STY-041 S5), then its items, each showing its pending English (STY-025). At the
 * foot of the screen, what publishing or unpublishing it came to (STY-035, STY-052 D21)
 * and its pending changes with Publish. The title stays whatever happens to the items.
 * It holds the page's one item dialog, which "Add an item" and each item's Edit open.
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
  const groups = useMemo(() => groupPageItems(pageItems), [pageItems])
  const navigation = usePlacementNavigation(groups, changes?.orders)
  // As the items area shows its placements, each with a heading to jump to: once both
  // reads are in, with an item to show (`RoadmapItemsArea`, `RoadmapItems`).
  const placementsShown =
    items.data !== undefined &&
    organisations.data !== undefined &&
    hasGroupedItems(groups)
  const heading = useRef<HTMLHeadingElement>(null)
  const addItemButton = useRef<HTMLButtonElement>(null)
  const publishedStateNotice = useRef<HTMLDivElement>(null)
  const publishNotice = useRef<HTMLDivElement>(null)
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
    void refetchList(JOIN_READ)
    void items.refetch(JOIN_READ)
    void organisations.refetch(JOIN_READ)
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
        <RoadmapHeader
          roadmap={roadmap}
          shown={shown}
          title={title}
          titleChanged={Boolean(changes?.roadmap.title)}
          heading={heading}
          publishedState={publishedState}
          about={<EditableRoadmapAbout roadmap={roadmap} />}
          fetching={
            listFetching || items.isFetching || organisations.isFetching
          }
          onRefresh={refresh}
          addItemButton={addItemButton}
          canAddItem={itemDialog.canAdd}
          onAddItem={() => {
            itemDialog.add()
          }}
          navigation={placementsShown ? navigation : undefined}
        />
        {/* Next in the page's order, where it stays on a short screen: elsewhere it
            pins to the foot (STY-052 S6). */}
        <RoadmapPublishing
          roadmap={roadmap}
          pageItems={pageItems}
          heading={heading}
          outcomeNotice={publishNotice}
          pageNotices={
            publishedState.notice && (
              <PublishedStateNotice
                ref={publishedStateNotice}
                notice={publishedState.notice}
                title={title}
                onDismiss={publishedState.dismissNotice}
              />
            )
          }
        />
        <PublishedStateDialog
          state={publishedState}
          title={title}
          // Its own notice, or the refusal of the changes it sent (D21).
          notice={() => publishedStateNotice.current ?? publishNotice.current}
        />
        <MatchListsAction roadmap={roadmap} />
        {addedNotice.shown && (
          <AddedRoadmapNotice title={title} onDismiss={addedNotice.dismiss} />
        )}
      </div>
      <RoadmapItemsArea
        roadmapId={roadmap.id}
        listFetching={listFetching}
        groups={groups}
        itemDialog={itemDialog}
        onItemRemoved={focusAddItem}
      />
    </div>
  )
}

interface RoadmapItemsAreaProps extends Pick<
  RoadmapItemsProps,
  "roadmapId" | "groups" | "itemDialog" | "onItemRemoved"
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
