import {
  ArrowDownIcon,
  ArrowDownToLineIcon,
  ArrowRightLeftIcon,
  ArrowUpIcon,
  ArrowUpToLineIcon,
} from "lucide-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"

import type { ItemMove } from "./moved-mark"

const ARROWS = {
  top: ArrowUpToLineIcon,
  up: ArrowUpIcon,
  down: ArrowDownIcon,
  bottom: ArrowDownToLineIcon,
  placement: ArrowRightLeftIcon,
} as const

export interface MovedLabelProps {
  move: ItemMove
  /**
   * Whether it is cut to its arrow and "Moved" in a list too narrow for it, as a compact
   * list is under 56rem (STY-071 S3, D6): judged by the nearest `@container`, the list's
   * own width, not the screen's. A screen reader still reads the whole label.
   */
  shortens?: boolean
}

/**
 * The moved mark's label (STY-071): in the success tone, apart from the blue of pending
 * tags (D10), an arrow saying which way the item went, then "Moved up", "Moved from Now"
 * or, for an unplaced item given a placement, "Placed"; never its position (D4).
 */
export function MovedLabel({ move, shortens = false }: MovedLabelProps) {
  const { t } = useTranslation()
  const Arrow = ARROWS[move.kind]
  const label =
    move.kind !== "placement"
      ? t(`roadmaps.edit.movedMark.${move.kind}`)
      : move.from === null
        ? t("roadmaps.edit.movedMark.placed")
        : t("roadmaps.edit.movedMark.from", {
            placement: t(`roadmaps.items.placements.${move.from}`),
          })
  const short = shortens && !(move.kind === "placement" && move.from === null)
  return (
    <Badge variant="success">
      <Arrow data-icon="inline-start" aria-hidden="true" />
      {short ? (
        <>
          <span aria-hidden="true" className="@4xl:hidden">
            {t("roadmaps.edit.movedMark.short")}
          </span>
          <span className="@max-4xl:sr-only">{label}</span>
        </>
      ) : (
        label
      )}
    </Badge>
  )
}
