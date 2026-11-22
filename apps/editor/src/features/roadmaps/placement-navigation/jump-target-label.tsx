import { TriangleAlertIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { UnpublishedDot } from "@/components/layout/unpublished-dot"
import { cn } from "@/lib/utils"

import { jumpTargetName, type JumpTargetSummary } from "./jump-targets"

/**
 * A jump target as a menu item or link shows it (STY-053 S2): its name, the unplaced
 * items' warning icon, its count and a dot while it holds a pending change, as flex
 * children of what holds them, the count pushed to the end where there is room. A
 * screen reader reads one phrase instead: "Now, 7 items, unpublished changes".
 *
 * In the menu (`inMenu`, STY-084) the rows form columns: the menu owns the leading mark,
 * the warning icon among them, and each row keeps the dot's place, hidden where nothing
 * is pending. In a row of links, which wrap and form none, the warning icon leads the
 * name and the dot shows only when pending.
 */
export function JumpTargetLabel({
  summary: { target, count, pending },
  inMenu = false,
}: {
  summary: JumpTargetSummary
  inMenu?: boolean
}) {
  const { t } = useTranslation()
  const name = jumpTargetName(target, t)
  return (
    <>
      {!inMenu && target === "unplaced" && (
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
      {(pending || inMenu) && (
        <UnpublishedDot
          className={cn("bg-status-info-border", !pending && "invisible")}
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
