import { ChevronRightIcon } from "lucide-react"
import { useId, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { localise } from "@/domain/roadmap/localised-text"
import type { Organisation } from "@/domain/roadmap/organisation"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import { useLanguage } from "@/i18n"
import { TABLET_WIDTH, useMediaQuery } from "@/lib/use-media-query"
import { cn } from "@/lib/utils"

import { HorizonFlag } from "./horizon-flag"
import { ItemFields } from "./item-fields"

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
  /** "Undo changes" or Remove, at the foot of the opened row, if the item has one. */
  drop?: ReactNode
}

/**
 * A roadmap item as a row of the compact view (STY-067): a chevron that opens the row
 * in place, its title as a heading, then Move and Edit, always at the row's end. From
 * a tablet's width one line that never wraps (S4): the title, then the start of its
 * description in the room the title leaves, each cut with an ellipsis, then an
 * unplaced item's flag, cut within a quarter of the line, and the pending tag; each
 * keeps its whole text for assistive technology. Narrower, the title on the lines it
 * needs, with no description, and the flag and the tag under it (S5, D10).
 *
 * A press on the title, or on the description and the room beside it, opens and closes
 * the row too (STY-069); only the chevron is a control, for a keyboard or a screen
 * reader.
 *
 * Opened, its title and its flag show whole, then every field the item has, as a card
 * labels and cuts them (S6, S7), and `drop`. Each row opens and closes by itself; it
 * starts closed, as the view does when it is drawn again (D11). A list item, for a
 * list of rows.
 */
export function CompactItemRow({
  item,
  organisations,
  tag,
  actions,
  drop,
}: CompactItemRowProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const id = useId()
  const wide = useMediaQuery(TABLET_WIDTH)
  const [open, setOpen] = useState(false)
  const title = localise(item.title, language)
  const description = item.description && localise(item.description, language)
  const horizon = item.writtenHorizon
  const wholeClasses = "wrap-break-word whitespace-pre-line"
  function toggle() {
    setOpen(!open)
  }
  // The text opens the row for a pointer; the chevron stays the one control for a
  // keyboard or a screen reader, so the text takes no role or focus (STY-069 D2).
  function toggleByText() {
    // A drag across the text to copy it ends in a click, which asks for nothing.
    if (!window.getSelection()?.toString()) toggle()
  }

  return (
    <li className="border-t first:border-t-0">
      <div
        className={cn(
          "flex",
          wide
            ? cn(
                "min-h-12 gap-3 py-2 pr-3 pl-2",
                open ? "items-start" : "items-center",
              )
            : "items-start gap-2 py-2 pr-2 pl-1",
        )}
      >
        <Button
          variant="ghost"
          size="icon-sm"
          aria-expanded={open}
          aria-controls={open ? id : undefined}
          onClick={toggle}
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
        </Button>
        {wide ? (
          <>
            {/* eslint-disable-next-line jsx-a11y-x/click-events-have-key-events, jsx-a11y-x/no-static-element-interactions -- the chevron is the keyboard's control */}
            <div
              onClick={toggleByText}
              className="flex min-w-0 flex-1 cursor-pointer items-baseline gap-3 py-1"
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
              <div className="flex max-w-1/4 min-w-0">
                <HorizonFlag writtenHorizon={horizon} cut={!open} />
              </div>
            )}
            {tag && <div className="flex shrink-0">{tag}</div>}
          </>
        ) : (
          // eslint-disable-next-line jsx-a11y-x/click-events-have-key-events, jsx-a11y-x/no-static-element-interactions -- the chevron is the keyboard's control
          <div
            onClick={toggleByText}
            className="flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-1.5 py-1"
          >
            <h3 className={cn("text-body font-bold", wholeClasses)}>{title}</h3>
            {horizon !== null && <HorizonFlag writtenHorizon={horizon} />}
            {tag}
          </div>
        )}
        <div className="flex shrink-0 gap-2">{actions(wide)}</div>
      </div>
      {open && (
        <div
          id={id}
          className={cn(
            "flex flex-col gap-3",
            // Under the title: the row's left padding, the 32px chevron and the gap.
            wide ? "pr-4 pb-4 pl-13" : "pr-3 pb-3 pl-11",
          )}
        >
          <ItemFields
            item={item}
            organisations={organisations}
            columns={wide}
          />
          {drop && <div className="flex">{drop}</div>}
        </div>
      )}
    </li>
  )
}
