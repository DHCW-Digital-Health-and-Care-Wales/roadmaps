import { PlusIcon } from "lucide-react"
import {
  type FocusEvent,
  type SyntheticEvent,
  useEffect,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { addNewItem } from "@/domain/roadmap/new-item"
import type { RoadmapItem } from "@/domain/roadmap/roadmap-item"
import type { RoadmapPlacement } from "@/domain/roadmap/roadmap-placement"
import { cn } from "@/lib/utils"

import type { ItemsView } from "../hooks/use-items-view"
import { usePendingChangesStore } from "./pending-changes-context"

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
}

/** A title as quick add keeps it: trimmed, its runs of spaces made one (S6). */
function tidyTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ")
}

/**
 * Whether a mouse button or a finger is down, while `watching`: a field left by a press
 * waits for the press to end before it closes (S5).
 */
function usePressUnderway(watching: boolean) {
  const pressing = useRef(false)
  useEffect(() => {
    if (!watching) return
    const press = () => {
      pressing.current = true
    }
    const release = () => {
      pressing.current = false
    }
    window.addEventListener("pointerdown", press, true)
    window.addEventListener("pointerup", release, true)
    window.addEventListener("pointercancel", release, true)
    return () => {
      window.removeEventListener("pointerdown", press, true)
      window.removeEventListener("pointerup", release, true)
      window.removeEventListener("pointercancel", release, true)
      pressing.current = false
    }
  }, [watching])
  return pressing
}

/** Calls `then` once the press under way has ended, after its click has landed. */
function afterThePress(then: () => void) {
  const ended = new AbortController()
  const end = () => {
    ended.abort()
    setTimeout(then)
  }
  for (const type of ["pointerup", "pointercancel"]) {
    window.addEventListener(type, end, {
      capture: true,
      signal: ended.signal,
    })
  }
}

/**
 * Quick add (STY-080): the last of a placement's cards or rows, "Add an item", or "Add
 * the first item" in a placement that has none, named for its placement (S1). Chosen,
 * a title field takes its place, focused, with Add and Cancel (S2). Enter, or Add,
 * keeps a new item with that title alone pending, last in the placement, says so, and
 * leaves the field open and empty for the next (S3); an empty title adds nothing (S6).
 * Escape and Cancel drop what was typed and bring the control back, focused (S4).
 * Leaving the field drops it too: a press elsewhere closes it only once the press has
 * ended, so the page shrinking under the pointer cannot move what was pressed (S5). A
 * press on the field's own Add or Cancel keeps focus in the title. It asks for no
 * session, since it writes nothing until a publish (D7).
 */
export function QuickAdd({
  roadmapId,
  items,
  placement,
  view,
  first,
  onAnnounce,
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
  const pressing = usePressUnderway(open)
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
    // A blur as the closing field leaves the page does not take back Escape's focus.
    returnFocus.current ||= focusControl
    setTitle("")
    setOpen(false)
  }
  const add = (event: SyntheticEvent) => {
    event.preventDefault()
    const tidied = tidyTitle(title)
    if (tidied === "") return
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
  const leave = (event: FocusEvent<HTMLLIElement>) => {
    const to = event.relatedTarget
    if (to instanceof Node && event.currentTarget.contains(to)) return
    // The window lost focus, not the field, which has it back on return.
    if (!document.hasFocus()) return
    if (!pressing.current) {
      close(false)
      return
    }
    afterThePress(() => {
      // Pressed back into the field meanwhile.
      if (entry.current?.contains(document.activeElement)) return
      close(false)
    })
  }
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
      onBlur={leave}
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
        <Input
          ref={field}
          value={title}
          aria-label={t("roadmaps.items.quickAdd.field", {
            placement: placementName,
          })}
          autoComplete="off"
          enterKeyHint="enter"
          className={cn(!cards && "md:flex-1")}
          onChange={(event) => {
            setTitle(event.target.value)
          }}
        />
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
