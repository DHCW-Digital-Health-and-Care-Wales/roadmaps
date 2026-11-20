import { Maximize2Icon, PlusIcon } from "lucide-react"
import {
  type RefObject,
  type SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { addNewItem, checkNewItem } from "@/domain/roadmap/new-item"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import type { RoadmapPlacement } from "@/domain/roadmap/roadmap-placement"
import { firstMounted } from "@/lib/first-mounted"
import { cn } from "@/lib/utils"

import type { ItemsView } from "../hooks/use-items-view"
import { usePendingChangesStore } from "./pending-changes-context"
import type { ExpandedQuickAdd } from "./use-item-dialog"
import { useLeaveAfterPress } from "./use-leave-after-press"

export interface QuickAddProps {
  roadmapId: string
  /** The roadmap's items as last read, which a new item's ID must differ from. */
  items: readonly RoadmapItem[]
  /** Where what it adds goes. */
  placement: RoadmapPlacement
  /** Whether it ends a list of cards or of the compact view's rows. */
  view: ItemsView
  /** Whether the placement shows no items, so what it adds is the first. */
  first: boolean
  /** Says a status message: what was added, and where. */
  onAnnounce: (message: string) => void
  /**
   * "Add more details" was chosen: opens the item dialog from `from`, the field while
   * it is open and else its "Add an item", to add the item `expanded` (STY-081).
   */
  onExpand: (
    from: RefObject<HTMLElement | null>,
    expanded: ExpandedQuickAdd,
  ) => void
}

/** A title as quick add keeps it: trimmed, its runs of spaces made one (S6). */
function tidyTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ")
}

/**
 * Quick add (STY-080): the last of a placement's cards or rows, "Add an item", or "Add
 * the first item" in a placement that has none, named for its placement (S1). Chosen,
 * a title field takes its place, focused, with Add and Cancel (S2). Enter, or Add,
 * keeps a new item with that title alone pending, last in the placement, says so, and
 * leaves the field open and empty for the next (S3); an empty title adds nothing (S6).
 * Escape and Cancel drop what was typed and bring the control back, focused (S4).
 * Leaving the field, by a press elsewhere or Tab, drops it too, once a press that left
 * it has landed (`useLeaveAfterPress`), so the page shrinking under the pointer cannot
 * move what was pressed (S5); focus the page takes itself, as the session warning does,
 * keeps it. A press on the field's own Add or Cancel keeps focus in the title. It
 * asks for no session, since it writes nothing until a publish (D7).
 *
 * "Add more details", inside the end of the title, opens the item dialog with the
 * title, tidied, and the placement (STY-081 S1, S2). The field stays open behind it, as
 * typed, for the dialog to return to, its cursor at the end, unless an item is added
 * there, which closes it (S3, S4, S7).
 */
export function QuickAdd({
  roadmapId,
  items,
  placement,
  view,
  first,
  onAnnounce,
  onExpand,
}: QuickAddProps) {
  const { t } = useTranslation()
  const store = usePendingChangesStore()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  // Bumped by each item added, so the field is brought into view again below it.
  const [added, setAdded] = useState(0)
  const entry = useRef<HTMLLIElement>(null)
  const field = useRef<HTMLInputElement>(null)
  const control = useRef<HTMLButtonElement>(null)
  // Whether the control takes focus back as the field closes: not when it was left.
  const returnFocus = useRef(false)
  const placementName = t(`roadmaps.items.placements.${placement}`)

  useEffect(() => {
    if (open) {
      field.current?.focus()
    } else if (returnFocus.current) {
      returnFocus.current = false
      control.current?.focus()
    }
  }, [open])
  useEffect(() => {
    // On a phone the keyboard covers the foot of the screen: the title, Add and Cancel
    // come into view above it (S7).
    if (open) entry.current?.scrollIntoView({ block: "nearest" })
  }, [open, added])

  const close = (focusControl: boolean) => {
    returnFocus.current = focusControl
    setTitle("")
    setOpen(false)
  }
  const add = (event: SyntheticEvent) => {
    event.preventDefault()
    const tidied = tidyTitle(title)
    // A blank title adds nothing, and the field stays (S6).
    if (checkNewItem({ title: tidied, placement }).problems.title) return
    store.update(roadmapId, (changes) =>
      addNewItem(changes, { title: tidied, placement }, items),
    )
    setTitle("")
    setAdded((count) => count + 1)
    // Back in the title for the next, as after Add chosen by keyboard.
    field.current?.focus()
    onAnnounce(
      t("roadmaps.items.quickAdd.added", {
        title: tidied,
        placement: placementName,
      }),
    )
  }
  const expand = () => {
    // Back from a dialog that added nothing, the cursor is at the title's end (S4).
    field.current?.setSelectionRange(title.length, title.length)
    // The dialog goes back to the field, else to the control once the field has closed.
    onExpand(firstMounted(field, control), {
      start: { title: tidyTitle(title), placement },
      onAdded: () => {
        close(false)
      },
    })
  }
  const leave = useLeaveAfterPress(open, () => {
    close(false)
  })
  // A press anywhere in the field but its title keeps focus in the title.
  const keepFocus = (event: SyntheticEvent) => {
    if (event.target !== field.current) event.preventDefault()
  }

  const cards = view === "cards"
  if (!open) {
    return (
      <li
        className={cn(
          "flex",
          cards ? "min-h-26 sm:min-h-30" : "border-t p-1 first:border-t-0",
        )}
      >
        <button
          ref={control}
          type="button"
          className={cn(
            "flex flex-1 cursor-pointer items-center text-muted-foreground outline-none hover:text-foreground focus-visible:focus-ring",
            cards
              ? "flex-col justify-center gap-1 border border-dashed p-4 hover:border-input"
              : // The plus under the rows' chevrons, the text in line with their titles.
                "min-h-10 gap-2 pr-2 text-left md:gap-3 md:pl-1",
          )}
          onClick={() => {
            setOpen(true)
          }}
        >
          <span className="grid size-8 shrink-0 place-items-center">
            <PlusIcon aria-hidden="true" className="size-4" />
          </span>
          <span>
            {t(
              first
                ? "roadmaps.items.quickAdd.first"
                : "roadmaps.items.quickAdd.open",
            )}
          </span>{" "}
          <span className="sr-only">
            {t("roadmaps.items.quickAdd.to", { placement: placementName })}
          </span>
        </button>
      </li>
    )
  }
  return (
    // Escape, focus leaving and a press are the field's as a whole, its title and its
    // buttons alike; each of those is a control a keyboard reaches.
    // eslint-disable-next-line jsx-a11y-x/no-noninteractive-element-interactions
    <li
      ref={entry}
      className={cn(
        cards
          ? "border border-dashed border-input bg-card p-4"
          : "border-t p-2 first:border-t-0",
      )}
      onFocus={leave.onFocus}
      onBlur={leave.onBlur}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return
        event.preventDefault()
        close(true)
      }}
      onPointerDown={keepFocus}
      onMouseDown={keepFocus}
    >
      <form
        className={cn(
          "flex flex-col gap-2",
          !cards && "md:flex-row md:items-center",
        )}
        onSubmit={add}
      >
        <div className={cn("relative", !cards && "md:flex-1")}>
          <Input
            ref={field}
            value={title}
            aria-label={t("roadmaps.items.quickAdd.field", {
              placement: placementName,
            })}
            autoComplete="off"
            enterKeyHint="enter"
            // Room for "Add more details" inside its end.
            className="pr-11"
            onChange={(event) => {
              setTitle(event.target.value)
            }}
          />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("roadmaps.items.quickAdd.more")}
                  className="absolute top-1 right-1 text-muted-foreground hover:text-foreground"
                  onClick={expand}
                />
              }
            >
              <Maximize2Icon aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>{t("roadmaps.items.quickAdd.more")}</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit">{t("roadmaps.items.quickAdd.add")}</Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              close(true)
            }}
          >
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </li>
  )
}
