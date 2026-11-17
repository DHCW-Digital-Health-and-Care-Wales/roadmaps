import { Undo2Icon } from "lucide-react"
import { useRef } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import type { RoadmapPlacement } from "@/domain/roadmap/roadmap-placement"

import { ChangedTag } from "./edit-controls"
import {
  usePendingChanges,
  usePendingChangesStore,
} from "./pending-changes-context"
import { discardable } from "./pending-changes-store"
import { undoOrder } from "./pending-orders"

export interface PlacementHeadingProps {
  roadmapId: string
  placement: RoadmapPlacement
  /** The heading's ID, which the placement's list of items is labelled by. */
  id: string
  /** Says a status message: that the placement's order was undone. */
  onAnnounce: (message: string) => void
}

/**
 * A placement's heading on a roadmap's page and, while its order is pending, the
 * "Order changed" tag and "Undo order" beside it, as an item's card shows "Changed" and
 * "Undo changes" (STY-050 S3). "Undo order" goes with the order it undoes, so focus
 * goes to the heading, and a status message says so; it waits while the roadmap is
 * being published (S15).
 */
export function PlacementHeading({
  roadmapId,
  placement,
  id,
  onAnnounce,
}: PlacementHeadingProps) {
  const { t } = useTranslation()
  const store = usePendingChangesStore()
  const snapshot = usePendingChanges()
  const heading = useRef<HTMLHeadingElement>(null)
  const name = t(`roadmaps.items.placements.${placement}`)
  const reordered = snapshot.changes
    .get(roadmapId)
    ?.orders.some((order) => order.placement === placement)
  const held = !discardable(snapshot, roadmapId)

  const undo = () => {
    if (held) return
    store.update(roadmapId, (changes) => undoOrder(changes, placement))
    heading.current?.focus()
    onAnnounce(t("roadmaps.edit.order.undone", { placement: name }))
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <h2
        id={id}
        ref={heading}
        tabIndex={-1}
        className="text-heading-m outline-none focus-visible:focus-ring"
      >
        {name}
      </h2>
      {reordered && (
        <>
          <ChangedTag label={t("roadmaps.edit.order.changed")} />
          <Button
            variant="secondary"
            size="sm"
            disabled={held}
            focusableWhenDisabled
            onClick={undo}
          >
            <Undo2Icon data-icon="inline-start" aria-hidden="true" />
            {t("roadmaps.edit.order.undo")}{" "}
            <span className="sr-only">{name}</span>
          </Button>
        </>
      )}
    </div>
  )
}
