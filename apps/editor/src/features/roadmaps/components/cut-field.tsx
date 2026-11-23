import { useId, useLayoutEffect, useRef, useState, type RefObject } from "react"
import { useTranslation } from "react-i18next"

import { textLinkClasses } from "@/components/layout/text-link-classes"
import type { DetailLine } from "@/domain/roadmap/item-details"
import { cn } from "@/lib/utils"

import { DetailList } from "./detail-list"

/** A field shows this many lines before it is cut (STY-066). */
const CUT_LINES = 3

/** The line-clamp class of each number of lines a detail may be cut to. */
const CLAMPS = [
  undefined,
  "line-clamp-1",
  "line-clamp-2",
  "line-clamp-3",
] as const

/** The element's line height in pixels, or none while it cannot be measured. */
function lineHeightOf(element: HTMLElement): number | undefined {
  const lineHeight = Number.parseFloat(getComputedStyle(element).lineHeight)
  // `normal`, or nothing to measure: the field shows whole.
  return Number.isNaN(lineHeight) ? undefined : lineHeight
}

/**
 * Whether a text's content, shown whole, takes more than three of its lines as drawn.
 * Read from `scrollHeight`, which holds the whole content however much of it the cut
 * hides, so the answer is the same cut or open and the control never changes it.
 */
function textRunsPastCut(element: HTMLElement): string {
  const lineHeight = lineHeightOf(element)
  return lineHeight !== undefined &&
    element.scrollHeight > lineHeight * (CUT_LINES + 0.5)
    ? "cut"
    : ""
}

/**
 * How a list of details is cut, one digit for each detail in the order it is drawn, the
 * nested ones after the one above them: the lines its own text may show, or 0 for all of
 * them. Empty when the list takes three lines or fewer. A detail the third line falls
 * within is cut to the lines that are left, so its ellipsis is on that line; one the
 * line falls after is shown whole, or hidden by the list's own height, and gains none.
 */
function detailCuts(list: HTMLElement): string {
  const lineHeight = lineHeightOf(list)
  if (lineHeight === undefined) return ""
  const lines = [...list.querySelectorAll<HTMLElement>("[data-detail]")].map(
    (detail) => Math.round(detail.scrollHeight / lineHeight),
  )
  if (lines.reduce((total, count) => total + count, 0) <= CUT_LINES) return ""
  let shown = 0
  return lines
    .map((count) => {
      const left = CUT_LINES - shown
      shown += count
      return count > left && left > 0 ? left : 0
    })
    .join("")
}

/**
 * What `measure` reads of the element as it is drawn at its width now, as a string so
 * an unchanged answer draws nothing again: measured as the layout is made, so the card
 * does not move after it is first drawn; again when the content changes and when the
 * element's width does, the page's room following the navigation, not the window; and
 * once the fonts are ready, since the element's own box keeps its height as a font
 * changes the lines inside it.
 */
function useMeasure(
  element: RefObject<HTMLElement | null>,
  content: string,
  measure: (element: HTMLElement) => string,
): string {
  const [measured, setMeasured] = useState("")
  useLayoutEffect(() => {
    const current = element.current
    if (!current) return
    let ended = false
    const read = () => {
      // eslint-disable-next-line @eslint-react/set-state-in-effect -- Measures the laid-out element, which only exists after render.
      if (!ended) setMeasured(measure(current))
    }
    read()
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(read)
    observer.observe(current)
    void document.fonts.ready.then(read)
    return () => {
      ended = true
      observer.disconnect()
    }
  }, [element, content, measure])
  return measured
}

interface CutControlProps {
  /** The id of what the control shows more of. */
  controls: string
  open: boolean
  onToggle: () => void
  /** Follows its words, for assistive technology: "of the description of First item". */
  subject: string
}

/**
 * "Show more", drawn as a text link, "Show less" once the field is open: one button,
 * which keeps focus as its words change and says whether the field is open.
 */
function CutControl({ controls, open, onToggle, subject }: CutControlProps) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      onClick={onToggle}
      className={cn(
        textLinkClasses,
        "mt-1 inline-flex min-h-6 items-center text-left",
      )}
    >
      {t(open ? "roadmaps.items.cut.less" : "roadmaps.items.cut.more")}{" "}
      <span className="sr-only">{subject}</span>
    </button>
  )
}

export interface CutFieldProps {
  /**
   * Names the field and its item after the control's "Show more" or "Show less", for
   * assistive technology: "of the description of First item".
   */
  subject: string
  children: string
}

/**
 * A text field's value, cut after three lines when it runs past them, with an ellipsis,
 * and a button under it that shows the rest in place and cuts it again (STY-066). A
 * field of three lines or fewer shows as it is, with no button. Opened it stays so until
 * it is shut or the card goes (D7). Its button stays while it is open, even if a resize
 * lets the field fit, so focus on "Show less" is not lost (D9). The text keeps its line
 * breaks, which the field's own class passes on.
 */
export function CutField({ subject, children }: CutFieldProps) {
  const id = useId()
  const valueRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const runsPast = useMeasure(valueRef, children, textRunsPastCut) !== ""

  return (
    <>
      <div ref={valueRef} id={id} className={cn(!open && "line-clamp-3")}>
        {children}
      </div>
      {(runsPast || open) && (
        <CutControl
          controls={id}
          open={open}
          onToggle={() => {
            setOpen(!open)
          }}
          subject={subject}
        />
      )}
    </>
  )
}

export interface CutDetailsProps {
  details: readonly DetailLine[]
  /** As `CutFieldProps.subject`. */
  subject: string
}

/**
 * A list of details, cut at its third line as drawn, every line a detail wraps onto and
 * every nested detail counting, with the same button as `CutField`. A browser's own
 * line clamp would end the third line in an ellipsis even where a detail ends there, so
 * the list is held to three lines by its height, and only the detail the cut falls
 * within is clamped, to the lines it has left (`detailCuts`). As in `CutField`, the
 * button stays while the list is open (D9).
 */
export function CutDetails({ details, subject }: CutDetailsProps) {
  const id = useId()
  const listRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const cuts = useMeasure(listRef, JSON.stringify(details), detailCuts)
  const cutAtThree = cuts !== "" && !open

  return (
    <>
      <div
        ref={listRef}
        id={id}
        className={cn(cutAtThree && "max-h-[calc(3*1lh)] overflow-hidden")}
      >
        <DetailList
          details={details}
          textClass={(index) => (cutAtThree ? clampOf(cuts, index) : undefined)}
        />
      </div>
      {(cuts !== "" || open) && (
        <CutControl
          controls={id}
          open={open}
          onToggle={() => {
            setOpen(!open)
          }}
          subject={subject}
        />
      )}
    </>
  )
}

/** The line-clamp class of the detail at `index`, from `detailCuts`' digits. */
function clampOf(cuts: string, index: number): string | undefined {
  return CLAMPS[Number(cuts[index] ?? 0)]
}
