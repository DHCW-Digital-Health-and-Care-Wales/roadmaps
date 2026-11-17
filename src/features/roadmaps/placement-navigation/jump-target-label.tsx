import { TriangleAlertIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { JumpTargetSummary } from "./jump-targets"
import { useJumpTargetName } from "./use-jump-target-name"

/**
 * A jump target as a menu item or link shows it (STY-053 S2): its name, the unplaced
 * items' warning icon, its count and a dot while it holds a pending change, as flex
 * children of what holds them, the count pushed to the end where there is room. A
 * screen reader reads one phrase instead: "Now, 7 items, unpublished changes".
 */
export function JumpTargetLabel({
  summary: { target, count, pending },
}: {
  summary: JumpTargetSummary
}) {
  const { t } = useTranslation()
  const name = useJumpTargetName()(target)
  return (
    <>
      {target === "unplaced" && (
        <TriangleAlertIcon
          aria-hidden="true"
          className="text-status-warning-fg"
        />
      )}
      <span aria-hidden="true">{name}</span>
      <span
        aria-hidden="true"
        className="ms-auto inline-grid min-w-5.5 place-items-center rounded-full bg-status-neutral-bg px-1.5 text-body-xs font-bold text-status-neutral-fg"
      >
        {count}
      </span>
      {pending && (
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full bg-status-info-border"
        />
      )}
      <span className="sr-only">
        {t(
          pending ? "roadmaps.jumpTo.targetPending" : "roadmaps.jumpTo.target",
          {
            name,
            count,
          },
        )}
      </span>
    </>
  )
}
