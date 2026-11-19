import { ChevronRightIcon } from "lucide-react"
import { type FocusEventHandler, type ReactNode, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { localise } from "@/domain/roadmap/localised-text"
import type { Organisation } from "@/domain/roadmap/organisation"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { useLanguage } from "@/i18n"
import { TABLET_WIDTH, useMediaQuery } from "@/lib/use-media-query"
import { cn } from "@/lib/utils"

import { HorizonFlag } from "./horizon-flag"
import { ItemFields } from "./item-fields"
import { STRUCK_TEXT_CLASSES } from "./struck-text"

export interface CompactItemRowProps {
  item: RoadmapItem
  /** The organisation list, which the item's `organisationIds` name (ADR-014). */
  organisations: readonly Organisation[]
  /** Its pending tag, "Changed" or "New", if it has one. */
  tag?: ReactNode
  /**
   * Move and Edit, at the row's end: in words on a desktop's line (`wide`), as icons on
   * a phone's (D12).
   */
  actions: (wide: boolean) => ReactNode
  /** "Undo changes" and Remove, or "Undo removal", at the foot of the opened row. */
  drop: ReactNode
  /**
   * Whether its text is struck through, as an item removed and not yet published is
   * (STY-049 S2): its controls are not.
   */
  struck?: boolean
  /**
   * Opens the row, shut or not, as focus is sent to a control at its foot: one drawn
   * afresh in another list, as a read that moves its item draws it, starts shut.
   */
  reveal?: boolean
  /**
   * The moved mark's label, on the item last moved (STY-071): where the pending tag is,
   * before it, with the mark's edge round the row.
   */
  mark?: ReactNode
  /**
   * The view transition name its travel after a move pairs it by (STY-072,
   * `travelNames`); with the moved `mark`, it travels raised above the others.
   */
  travelName?: string | undefined
  /** Focus has come to one of its controls. */
  onFocus?: FocusEventHandler<HTMLLIElement> | undefined
}

/**
 * A roadmap item as a row of the compact view (STY-067): a chevron that opens the row
 * in place, its title as a heading, then Move and Edit, always at the row's end. From
 * a tablet's width one line that never wraps (S4): the title, then the start of its
 * description in the room the title leaves, each cut with an ellipsis, then an
 * unplaced item's flag, cut within a quarter of the line, and the moved mark's label and
 * the pending tag (STY-071 S3); each keeps its whole text for assistive technology.
 * Narrower, the title on the lines it needs, with no description, and the flag, the
 * label and the tag under it (S5, D10).
 *
 * The chevron is a Collapsible's trigger, stretched across the whole line (STY-069), so
 * a press anywhere on it but Move and Edit opens and closes the row, and the chevron is
 * still the one control a keyboard or a screen reader reaches. The text sits under the
 * stretch, so it can't be selected.
 *
 * Opened, its title and its flag show whole, then every field the item has, as a card
 * labels and cuts them (S6, S7), and `drop`. Its text is struck through when `struck`.
 * Each row opens and closes by itself; it starts closed, as the view does when it is
 * drawn again (D11). A list item, for a list of rows.
 */
export function CompactItemRow({
  item,
  organisations,
  tag,
  actions,
  drop,
  struck = false,
  reveal = false,
  mark,
  travelName,
  onFocus,
}: CompactItemRowProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const wide = useMediaQuery(TABLET_WIDTH)
  const [open, setOpen] = useState(false)
  // Adjusting state while rendering, as React documents for state that follows props.
  if (reveal && !open) setOpen(true)
  const title = localise(item.title, language)
  const description = item.description && localise(item.description, language)
  const horizon = item.writtenHorizon
  const wholeClasses = "wrap-break-word whitespace-pre-line"
  const struckClasses = struck ? STRUCK_TEXT_CLASSES : undefined

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      render={
        <li
          className={cn(
            // Opaque, as its list is, so it hides the rows it passes as it travels.
            "border-t bg-card first:border-t-0",
            mark &&
              "relative z-1 shadow-moved-mark-row [view-transition-class:moved-item]",
          )}
          style={{ viewTransitionName: travelName }}
          onFocus={onFocus}
        />
      }
    >
      <div
        className={cn(
          "relative flex",
          wide
            ? cn(
                "min-h-12 gap-3 py-2 pr-3 pl-2",
                open ? "items-start" : "items-center",
              )
            : "items-start gap-2 py-2 pr-2 pl-1",
        )}
      >
        <CollapsibleTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              // The stretch: an overlay across the line, under Move and Edit. The base
              // button's press nudge would make it the overlay's box, so it is off.
              className="cursor-pointer after:absolute after:inset-0 active:not-aria-[haspopup]:translate-none"
            />
          }
        >
          <ChevronRightIcon
            aria-hidden="true"
            className={cn("transition-transform", open && "rotate-90")}
          />
          <span className="sr-only">
            {t(open ? "roadmaps.items.row.hide" : "roadmaps.items.row.show", {
              item: title,
            })}
          </span>
        </CollapsibleTrigger>
        {wide ? (
          <>
            <div
              className={cn(
                "flex min-w-0 flex-1 items-baseline gap-3 py-1",
                struckClasses,
              )}
            >
              <h3
                className={cn(
                  "min-w-0 text-body font-bold",
                  open ? wholeClasses : "truncate",
                )}
              >
                {title}
              </h3>
              {!open && description && (
                <p className="min-w-0 flex-1 basis-0 truncate text-body-xs text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            {horizon !== null && (
              // A quarter of the line at most, so the title keeps its room: cut on one
              // line while the row is closed, wrapping once it is opened.
              <div className={cn("flex max-w-1/4 min-w-0", struckClasses)}>
                <HorizonFlag writtenHorizon={horizon} cut={!open} />
              </div>
            )}
            {(mark ?? tag) && (
              <div className="flex shrink-0 gap-2">
                {mark}
                {tag}
              </div>
            )}
          </>
        ) : (
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5 py-1">
            <h3
              className={cn("text-body font-bold", wholeClasses, struckClasses)}
            >
              {title}
            </h3>
            {horizon !== null && (
              <div className={struckClasses}>
                <HorizonFlag writtenHorizon={horizon} />
              </div>
            )}
            {mark}
            {tag}
          </div>
        )}
        <div className="relative z-10 flex shrink-0 gap-2">{actions(wide)}</div>
      </div>
      <CollapsibleContent
        className={cn(
          "flex flex-col gap-3",
          // Under the title: the row's left padding, the 32px chevron and the gap.
          wide ? "pr-4 pb-4 pl-13" : "pr-3 pb-3 pl-11",
        )}
      >
        <div className={struckClasses}>
          <ItemFields
            item={item}
            organisations={organisations}
            columns={wide}
          />
        </div>
        <div className="flex">{drop}</div>
      </CollapsibleContent>
    </Collapsible>
  )
}
