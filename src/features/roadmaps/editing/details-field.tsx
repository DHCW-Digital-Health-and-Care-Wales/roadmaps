import {
  ArrowDownIcon,
  ArrowUpIcon,
  ListIndentDecreaseIcon,
  ListIndentIncreaseIcon,
  Trash2Icon,
} from "lucide-react"
import {
  type ClipboardEvent,
  type ComponentType,
  type KeyboardEvent,
  type MouseEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  type DetailLine,
  detailText,
  keptDetails,
  shiftedDetails,
  withoutDetail,
} from "@/domain/roadmap/item-details"
import { cn } from "@/lib/utils"

import { DetailList } from "../components/detail-list"
import {
  type EditorLine,
  identify,
  joinedToAbove,
  movedDown,
  movedUp,
  nestedUnder,
  parentOf,
  pastedInto,
  type Refusal,
  splitAt,
  typedInto,
  whyNotDown,
  whyNotIn,
  whyNotOut,
  whyNotUp,
} from "./details-outline"
import {
  detailName,
  type DetailsMessage,
  detailsMessageText,
} from "./details-messages"
import { OpeningField } from "./opening-field"

export interface DetailsFieldProps {
  label: string
  /** The item's details as the form opened, each at the level it shows at. */
  initial: readonly DetailLine[]
  /**
   * The item's details as the card listed them when the form opened, which the field
   * shows until it is first opened (S17): a list read deeper than three levels shows at
   * the third only then (D12). `null` once the form holds other details than it opened
   * on, which the field then shows, however it is drawn again.
   */
  asListed: readonly DetailLine[] | null
  /**
   * Called with the details confirming the form would keep, whenever they change: those
   * written, a detail with no text left out (S5, S10).
   */
  onChange: (details: readonly DetailLine[]) => void
}

const BLANK: DetailLine = { text: "", level: 0 }

/** The list always holds a detail to write in: an empty one, when it holds no other (D19). */
function orBlank(lines: readonly EditorLine[]): EditorLine[] {
  return lines.length > 0 ? [...lines] : [identify(BLANK)]
}

/**
 * An item's details in its edit form (STY-039): shut, they show as the card lists them
 * beside "Change details", or "Add details" for none (S17); open, they are an outline
 * written like a document (editor A, D10): a line of text each, indented as it will
 * read, with buttons under the list that act on the detail being written. Shutting
 * keeps what is written, as confirming the form does.
 */
export function DetailsField({
  label,
  initial,
  asListed,
  onChange,
}: DetailsFieldProps) {
  const { t } = useTranslation()
  const [lines, setLines] = useState(() => orBlank(initial.map(identify)))
  const [current, setCurrent] = useState(() => lines[0]?.id ?? 0)
  const [opened, setOpened] = useState(false)
  const kept = opened || !asListed ? keptDetails(lines) : asListed

  return (
    <OpeningField
      label={label}
      subject={t("roadmaps.edit.details.subject")}
      summary={kept.length > 0 ? <DetailList details={kept} /> : null}
      none={t("roadmaps.edit.details.none")}
      hint={t("roadmaps.edit.details.hint")}
      onShut={() => {
        // What confirming the form would keep, now shown as the field's details.
        const settled = orBlank(keptDetails(lines))
        setLines(settled)
        if (!settled.some(({ id }) => id === current)) {
          setCurrent(settled[0]?.id ?? 0)
        }
      }}
    >
      {() => (
        <DetailsEditor
          lines={lines}
          current={current}
          onOpened={() => {
            setOpened(true)
          }}
          onSelect={setCurrent}
          onApply={(next, selected) => {
            const shown = orBlank(next)
            setLines(shown)
            setCurrent(
              shown.some(({ id }) => id === selected)
                ? selected
                : (shown[0]?.id ?? 0),
            )
            onChange(keptDetails(shown))
          }}
        />
      )}
    </OpeningField>
  )
}

/** Where focus goes once a change is drawn: a detail's text, the caret at `caret`. */
interface FocusTarget {
  readonly id: number
  readonly caret: number
}

type ActionName = "moveOut" | "moveIn" | "moveUp" | "moveDown" | "remove"

/** The buttons under the list, in order; the last three show as icons. */
const ACTIONS: readonly {
  name: ActionName
  Icon: ComponentType<{ "aria-hidden": "true" }>
  iconOnly: boolean
}[] = [
  { name: "moveOut", Icon: ListIndentDecreaseIcon, iconOnly: false },
  { name: "moveIn", Icon: ListIndentIncreaseIcon, iconOnly: false },
  { name: "moveUp", Icon: ArrowUpIcon, iconOnly: true },
  { name: "moveDown", Icon: ArrowDownIcon, iconOnly: true },
  { name: "remove", Icon: Trash2Icon, iconOnly: true },
]

/** The indent of each level a detail can show at. */
const INDENTS = ["pl-0", "pl-5", "pl-10"] as const

interface DetailsEditorProps {
  lines: readonly EditorLine[]
  /** The detail the buttons act on, and the list's one stop for the Tab key (S24). */
  current: number
  /** Called once the outline is first drawn. */
  onOpened: () => void
  onSelect: (id: number) => void
  /** Keeps a changed list, with the detail then selected. */
  onApply: (lines: readonly EditorLine[], current: number) => void
}

/**
 * The open Details field's outline. Enter starts the next detail (S21), Backspace at
 * the start of one moves it out or joins it to the one above (S22), and the Up and Down
 * arrows at a detail's start and end move between details (S24); the Tab key is never
 * taken (D6). Each move, addition, removal and refusal is said in a status line, and
 * focus stays in the field (S13).
 */
function DetailsEditor({
  lines,
  current,
  onOpened,
  onSelect,
  onApply,
}: DetailsEditorProps) {
  const { t } = useTranslation()
  // Numbered, so a message said twice running is still a new one.
  const [said, setSaid] = useState<{
    serial: number
    message: DetailsMessage
  } | null>(null)
  const say = (message: DetailsMessage | null) => {
    setSaid((last) => message && { serial: (last?.serial ?? 0) + 1, message })
  }
  const fields = useRef(new Map<number, HTMLTextAreaElement>())
  // Where the caret was in the current detail when focus last left its text (S23).
  const caret = useRef(0)

  // Focus is moved once the change that asked for it has been drawn.
  const focusNext = useRef<FocusTarget | null>(null)
  const place = ({ id, caret: at }: FocusTarget) => {
    const field = fields.current.get(id)
    field?.focus()
    field?.setSelectionRange(at, at)
  }
  useLayoutEffect(() => {
    if (focusNext.current) place(focusNext.current)
    focusNext.current = null
  })
  // As the field opens, focus is at the end of the detail last written in.
  useEffect(() => {
    const field = fields.current.get(current)
    if (field) place({ id: current, caret: field.value.length })
    onOpened()
    // Only as the editor is first drawn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const indexOf = (id: number) => lines.findIndex((line) => line.id === id)
  const parentText = (list: readonly EditorLine[], index: number) =>
    parentOf(list, index)?.text ?? null

  /** Keeps a changed list, says it, and puts focus where the change leaves it. */
  const change = (
    next: readonly EditorLine[],
    selected: number,
    message: DetailsMessage | null,
    focus?: FocusTarget,
  ) => {
    onApply(next, selected)
    say(message)
    if (focus) focusNext.current = focus
  }
  const refuse = (why: Refusal, focus?: FocusTarget) => {
    say({ kind: "refused", why })
    if (focus) place(focus)
  }

  const moveIn = (index: number, id: number, focus?: FocusTarget) => {
    const why = whyNotIn(lines, index)
    if (why) {
      refuse(why, focus)
      return
    }
    const next = shiftedDetails(lines, index, 1)
    change(
      next,
      id,
      { kind: "movedIn", parent: parentText(next, index) },
      focus,
    )
  }
  const moveOut = (index: number, id: number, focus?: FocusTarget) => {
    const why = whyNotOut(lines, index)
    if (why) {
      refuse(why, focus)
      return
    }
    const next = shiftedDetails(lines, index, -1)
    change(
      next,
      id,
      { kind: "movedOut", parent: parentText(next, index) },
      focus,
    )
  }
  const move = (
    index: number,
    id: number,
    kind: "movedUp" | "movedDown",
    focus?: FocusTarget,
  ) => {
    const why = (kind === "movedUp" ? whyNotUp : whyNotDown)(lines, index)
    if (why) {
      refuse(why, focus)
      return
    }
    const next = (kind === "movedUp" ? movedUp : movedDown)(lines, index)
    change(next, id, { kind }, focus)
  }
  const remove = (index: number, focus?: FocusTarget) => {
    const removed = lines[index]
    if (!removed) return
    const blank = detailText(removed.text) === ""
    if (blank && lines.length === 1) {
      refuse("nothing", focus)
      return
    }
    const next = withoutDetail(lines, index)
    // Focus goes to the detail now in its place, so a second press removes nothing
    // more (D19); with none left, the list's empty detail takes it.
    const after = next[index] ?? next[index - 1] ?? identify(BLANK)
    change(
      next.length > 0 ? next : [after],
      after.id,
      blank
        ? { kind: "removedEmpty" }
        : {
            kind: "removed",
            detail: detailText(removed.text),
            nested: nestedUnder(lines, index),
            before: lines,
            id: removed.id,
          },
      { id: after.id, caret: 0 },
    )
  }
  const undoRemove = (message: DetailsMessage & { kind: "removed" }) => {
    const put = message.before.find(({ id }) => id === message.id)
    change(
      message.before,
      message.id,
      { kind: "putBack", detail: message.detail },
      { id: message.id, caret: put?.text.length ?? 0 },
    )
  }

  const typed = (line: EditorLine, field: HTMLTextAreaElement) => {
    const index = indexOf(line.id)
    const result = typedInto(lines, index, field.value)
    const message: DetailsMessage | null = result.refusal
      ? { kind: "refused", why: result.refusal }
      : result.nested > 0
        ? { kind: "movedIn", parent: parentText(result.lines, index) }
        : null
    change(
      result.lines,
      line.id,
      message,
      // Text dropped before the caret would otherwise leave it at the end.
      result.lead > 0
        ? {
            id: line.id,
            caret: Math.max(0, field.selectionStart - result.lead),
          }
        : undefined,
    )
  }

  const keyed = (
    event: KeyboardEvent<HTMLTextAreaElement>,
    line: EditorLine,
  ) => {
    if (event.nativeEvent.isComposing) return
    const field = event.currentTarget
    const index = indexOf(line.id)
    const atStart = field.selectionStart === 0 && field.selectionEnd === 0
    if (event.key === "Enter") {
      // Never a line break in a detail, nor the form confirmed from one (S8).
      event.preventDefault()
      if (detailText(line.text) === "") {
        // An empty nested detail steps back out, as a list does in a document (D17).
        if (line.level > 0) moveOut(index, line.id, { id: line.id, caret: 0 })
        return
      }
      const next = splitAt(
        lines,
        index,
        field.selectionStart,
        field.selectionEnd,
        (text, level) => identify({ text, level }),
      )
      const fresh = next[index + 1]
      if (!fresh) return
      change(
        next,
        fresh.id,
        { kind: "new", parent: parentText(next, index + 1) },
        { id: fresh.id, caret: 0 },
      )
    } else if (event.key === "Backspace" && atStart) {
      if (line.level > 0) {
        event.preventDefault()
        moveOut(index, line.id, { id: line.id, caret: 0 })
      } else if (index > 0) {
        // At the top level it joins the detail above (S22).
        event.preventDefault()
        const joined = joinedToAbove(lines, index)
        const into = joined.lines[joined.into]
        if (!into) return
        change(
          joined.lines,
          into.id,
          { kind: line.text === "" ? "removedEmpty" : "joined" },
          { id: into.id, caret: joined.caret },
        )
      }
    } else if (event.key === "ArrowUp" && atStart && index > 0) {
      const above = lines[index - 1]
      if (!above) return
      event.preventDefault()
      place({ id: above.id, caret: above.text.length })
    } else if (
      event.key === "ArrowDown" &&
      field.selectionStart === field.value.length
    ) {
      const below = lines[index + 1]
      if (!below) return
      event.preventDefault()
      place({ id: below.id, caret: 0 })
    }
  }

  /** Pasted lines become details; text on one line is pasted as the browser does it. */
  const pasted = (
    event: ClipboardEvent<HTMLTextAreaElement>,
    line: EditorLine,
  ) => {
    const text = event.clipboardData.getData("text")
    if (!/[\r\n]/.test(text)) return
    event.preventDefault()
    const result = pastedInto(lines, indexOf(line.id), text, identify)
    const last = result?.lines[result.last]
    if (!result || !last) return
    change(
      result.lines,
      last.id,
      { kind: "added", count: result.added, limited: result.limited },
      { id: last.id, caret: last.text.length },
    )
  }

  const currentIndex = Math.max(0, indexOf(current))
  const selected = lines[currentIndex]
  const why: Record<ActionName, Refusal | null> = {
    moveOut: whyNotOut(lines, currentIndex),
    moveIn: whyNotIn(lines, currentIndex),
    moveUp: whyNotUp(lines, currentIndex),
    moveDown: whyNotDown(lines, currentIndex),
    remove:
      lines.length === 1 && detailText(selected?.text ?? "") === ""
        ? "nothing"
        : null,
  }
  const act = (name: ActionName, event: MouseEvent<HTMLButtonElement>) => {
    if (!selected) return
    // Chosen with a pointer, the caret goes back to the detail's text where it was;
    // chosen with the keyboard, focus stays on the button (S23).
    const focus =
      event.detail > 0 ? { id: selected.id, caret: caret.current } : undefined
    switch (name) {
      case "moveOut":
        moveOut(currentIndex, selected.id, focus)
        break
      case "moveIn":
        moveIn(currentIndex, selected.id, focus)
        break
      case "moveUp":
        move(currentIndex, selected.id, "movedUp", focus)
        break
      case "moveDown":
        move(currentIndex, selected.id, "movedDown", focus)
        break
      case "remove":
        remove(currentIndex, focus)
    }
  }

  const subject = detailName(selected?.text ?? "", t)
  const actionButton = ({ name, Icon, iconOnly }: (typeof ACTIONS)[number]) => {
    const word = t(`roadmaps.edit.details.actions.${name}`)
    return (
      <Button
        key={name}
        type="button"
        variant="secondary"
        size={iconOnly ? "icon-sm" : "sm"}
        title={iconOnly ? word : undefined}
        // It can still be reached and chosen, and then says why (S23).
        aria-disabled={why[name] !== null}
        onClick={(event) => {
          act(name, event)
        }}
      >
        {/* Faded inside, so the button's own focus indicator stays whole. */}
        <span className="inline-flex items-center gap-1.5 group-aria-disabled/button:opacity-50">
          <Icon aria-hidden="true" />
          <span className={cn(iconOnly && "sr-only")}>{word}</span>
        </span>{" "}
        <span className="sr-only">{subject}</span>
      </Button>
    )
  }

  const message = said?.message
  const text = message ? detailsMessageText(message, t) : ""
  const loud =
    message?.kind === "refused" ||
    message?.kind === "removed" ||
    (message?.kind === "added" && message.limited)

  return (
    <>
      <ul className="flex flex-col border-2 border-input bg-background p-1">
        {lines.map((line, index) => {
          const parent = parentText(lines, index)
          return (
            <li
              key={line.id}
              className={cn(
                "flex items-start gap-1.5",
                INDENTS[line.level],
                line.id === selected?.id && "bg-muted",
              )}
            >
              <span
                aria-hidden="true"
                className="mt-3.5 size-1.5 shrink-0 rounded-full bg-foreground"
              />
              <textarea
                ref={(field) => {
                  if (field) fields.current.set(line.id, field)
                  else fields.current.delete(line.id)
                }}
                rows={1}
                value={line.text}
                tabIndex={line.id === selected?.id ? 0 : -1}
                aria-label={
                  parent === null
                    ? t("roadmaps.edit.details.name.top", {
                        position: index + 1,
                        total: lines.length,
                      })
                    : t("roadmaps.edit.details.name.nested", {
                        position: index + 1,
                        total: lines.length,
                        parent: detailName(parent, t),
                      })
                }
                autoCapitalize="sentences"
                className="field-sizing-content min-h-8 min-w-0 flex-1 resize-none rounded-none bg-transparent px-1.5 py-1 text-body wrap-anywhere text-foreground outline-none focus-visible:focus-ring"
                onFocus={() => {
                  if (line.id !== current) onSelect(line.id)
                }}
                onBlur={(event) => {
                  if (line.id === current) {
                    caret.current = event.currentTarget.selectionStart
                  }
                }}
                onChange={(event) => {
                  typed(line, event.currentTarget)
                }}
                onKeyDown={(event) => {
                  keyed(event, line)
                }}
                onPaste={(event) => {
                  pasted(event, line)
                }}
              />
            </li>
          )
        })}
      </ul>
      <div
        role="group"
        aria-label={t("roadmaps.edit.details.selected")}
        className="flex flex-wrap items-center gap-1.5"
        // Not every browser moves focus to a button pressed with a pointer (Safari),
        // so the text may never blur: the caret is read before the button acts (S23).
        onPointerDown={() => {
          const field = selected && fields.current.get(selected.id)
          if (field && field === document.activeElement) {
            caret.current = field.selectionStart
          }
        }}
      >
        {ACTIONS.filter(({ iconOnly }) => !iconOnly).map(actionButton)}
        {/* The three shown as icons wrap together where the card is narrow. */}
        <span className="flex gap-1.5">
          {ACTIONS.filter(({ iconOnly }) => iconOnly).map(actionButton)}
        </span>
      </div>
      <p className="text-body-xs text-muted-foreground">
        {t("roadmaps.edit.details.keys")}
      </p>
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-1.5 text-body-xs",
          !loud && "sr-only",
        )}
      >
        <p role="status">
          {/* A new node each time, so a message said twice is announced twice. */}
          <span key={said?.serial}>{text}</span>
        </p>
        {message?.kind === "removed" && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              undoRemove(message)
            }}
          >
            {t("roadmaps.edit.details.undoRemove")}{" "}
            <span className="sr-only">
              {t("roadmaps.edit.details.undoRemoveSubject", {
                detail: message.detail,
              })}
            </span>
          </Button>
        )}
      </div>
    </>
  )
}
