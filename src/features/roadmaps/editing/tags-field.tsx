import {
  CheckIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import type { TFunction } from "i18next"
import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

import {
  addTags,
  endsATag,
  NO_DRAFT,
  offeredTags,
  renameTag,
  settleTags,
  type TagInUse,
  type TagNote,
  type TagsDraft,
} from "./item-tags"
import { OpeningField } from "./opening-field"
import { TagList } from "./tag-list"
import { RowButton, RowProbe } from "./tag-row-buttons"
import { useRowIcons } from "./use-row-icons"

export interface TagsFieldProps {
  label: string
  /** The item's tags as the form opened, in order. */
  initial: readonly string[]
  /** The tags the roadmap's other items carry, to offer (S3). */
  inUse: readonly TagInUse[]
  /**
   * Called with the tags confirming the form would keep, whenever they change: those
   * shown, with a name still being changed and the text typed but not yet added
   * (S8, S15).
   */
  onChange: (tags: readonly string[]) => void
}

/**
 * An item's tags in its edit form (STY-037): shut, they show on one line beside "Change
 * tags", or "Add tags" for none (S19); open, each is a row with Rename and Remove, over
 * a field for a new tag and the roadmap's other tags as buttons (design B, D11).
 * Shutting keeps what is half done, as confirming the form does.
 */
export function TagsField({ label, initial, inUse, onChange }: TagsFieldProps) {
  const { t } = useTranslation()
  const [tags, setTags] = useState(initial)
  const [draft, setDraft] = useState(NO_DRAFT)
  const apply = (nextTags: readonly string[], nextDraft: TagsDraft) => {
    setTags(nextTags)
    setDraft(nextDraft)
    onChange(settleTags(nextTags, nextDraft, inUse))
  }
  // What is half done is kept in the roadmap's spelling (S21), which another item's
  // tags, confirmed meanwhile, may have changed: the form is told what it now keeps.
  const keepInStep = useEffectEvent(() => {
    if (draft !== NO_DRAFT) onChange(settleTags(tags, draft, inUse))
  })
  useEffect(() => {
    keepInStep()
  }, [inUse])

  return (
    <OpeningField
      label={label}
      subject={t("roadmaps.edit.tags.subject")}
      summary={tags.length > 0 ? <TagList tags={tags} /> : null}
      none={t("roadmaps.edit.tags.none")}
      onShut={() => {
        // What confirming the form would keep, now shown as the field's tags.
        const settled = settleTags(tags, draft, inUse)
        setTags(settled)
        setDraft(NO_DRAFT)
        onChange(settled)
      }}
    >
      {(focusOnOpen) => (
        <TagsEditor
          tags={tags}
          draft={draft}
          inUse={inUse}
          focusOnOpen={focusOnOpen}
          onApply={apply}
        />
      )}
    </OpeningField>
  )
}

/** What the editor says of a change; `added` and `putBack` reach assistive technology only. */
type Message =
  | {
      readonly kind: "notes"
      readonly notes: readonly TagNote[]
      /** Tags added by the same change, said first (S11). */
      readonly added: readonly string[]
    }
  | { readonly kind: "added"; readonly tags: readonly string[] }
  | { readonly kind: "removed"; readonly tag: string; readonly index: number }
  | { readonly kind: "putBack"; readonly tag: string }

interface TagsEditorProps {
  tags: readonly string[]
  draft: TagsDraft
  inUse: readonly TagInUse[]
  /** The `ref` of "Add a tag", which takes focus as the field opens. */
  focusOnOpen: (control: HTMLElement | null) => void
  onApply: (tags: readonly string[], draft: TagsDraft) => void
}

/**
 * The open Tags field's controls. Every control first keeps a name still being changed
 * (S15); each addition, removal and refusal is said in a status line (S11); focus stays
 * in the field, on the control that takes the place of the one used.
 */
function TagsEditor({
  tags,
  draft,
  inUse,
  focusOnOpen,
  onApply,
}: TagsEditorProps) {
  const { t } = useTranslation()
  const id = useId()
  const addId = `${id}-add`
  const elsewhereId = `${id}-elsewhere`
  // Numbered, so a message said twice running is still a new one.
  const [said, setSaid] = useState<{
    serial: number
    message: Message
  } | null>(null)
  const say = (message: Message | null) => {
    setSaid((last) => message && { serial: (last?.serial ?? 0) + 1, message })
  }
  const rows = useRef<HTMLUListElement>(null)
  const offers = useRef<HTMLUListElement>(null)
  const renameField = useRef<HTMLInputElement>(null)
  const icons = useRowIcons(rows, tags)

  // Focus is moved once the change that asked for it has been drawn.
  const focusNext = useRef<(() => void) | null>(null)
  useLayoutEffect(() => {
    focusNext.current?.()
    focusNext.current = null
  })
  const addField = () => document.getElementById(addId)
  const focusControl = (
    list: typeof rows,
    control: "rename" | "remove" | "offer",
    index: number,
  ) => {
    focusNext.current = () => {
      const controls = list.current?.querySelectorAll<HTMLElement>(
        `[data-tag-control="${control}"]`,
      )
      const at = Math.min(index, (controls?.length ?? 0) - 1)
      ;(controls?.[at] ?? addField())?.focus()
    }
  }

  /** The tags with a name still being changed kept, as every control first does. */
  const renamed = () =>
    draft.renaming
      ? renameTag(tags, draft.renaming.index, draft.renaming.name, inUse).tags
      : tags
  const sayChange = (
    notes: readonly TagNote[],
    added: readonly string[] = [],
  ) => {
    if (notes.length > 0) say({ kind: "notes", notes, added })
    else say(added.length > 0 ? { kind: "added", tags: added } : null)
  }

  const add = (text: string) => {
    const result = addTags(renamed(), text, inUse)
    onApply(result.tags, NO_DRAFT)
    sayChange(result.notes, result.added)
  }
  const remove = (tag: string) => {
    const kept = renamed()
    const index = kept.indexOf(tag)
    if (index < 0) return
    onApply(
      kept.filter((_, at) => at !== index),
      { ...draft, renaming: null },
    )
    say({ kind: "removed", tag, index })
    focusControl(rows, "remove", index)
  }
  const undoRemove = (tag: string, index: number) => {
    const at = Math.min(index, tags.length)
    onApply([...tags.slice(0, at), tag, ...tags.slice(at)], draft)
    say({ kind: "putBack", tag })
    focusControl(rows, "remove", at)
  }
  const startRename = (tag: string) => {
    const kept = renamed()
    const index = kept.indexOf(tag)
    if (index < 0) return
    onApply(kept, { ...draft, renaming: { index, name: tag } })
    // An Undo would put a tag back among tags that have changed since.
    say(null)
    focusNext.current = () => {
      renameField.current?.focus()
      renameField.current?.select()
    }
  }
  const finishRename = (keep: boolean) => {
    if (!draft.renaming) return
    const { index, name } = draft.renaming
    const result = keep
      ? renameTag(tags, index, name, inUse)
      : { tags, notes: [] }
    onApply(result.tags, { ...draft, renaming: null })
    sayChange(result.notes)
    focusControl(rows, "rename", index)
  }

  const typed = draft.adding.replace(/\s+/g, " ").trim()
  const offered = offeredTags(inUse, tags, draft.adding)
  const anyOffered = offeredTags(inUse, tags, "").length > 0
  const message = said?.message
  const text = message ? messageText(message, t) : ""
  const quiet = message?.kind === "added" || message?.kind === "putBack"

  return (
    <>
      {tags.length > 0 && (
        <ul
          ref={rows}
          aria-label={t("roadmaps.edit.tags.onItem")}
          className="relative flex flex-col border-b border-border"
        >
          {tags.map((tag, index) => (
            <li
              key={tag}
              className="flex items-center justify-between gap-2 border-t border-border py-2"
            >
              {draft.renaming?.index === index ? (
                <>
                  <Input
                    ref={renameField}
                    aria-label={t("roadmaps.edit.tags.renameField", { tag })}
                    value={draft.renaming.name}
                    autoComplete="off"
                    autoCapitalize="off"
                    className="flex-1"
                    onChange={(event) => {
                      onApply(tags, {
                        ...draft,
                        renaming: { index, name: event.target.value },
                      })
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== "Escape") {
                        return
                      }
                      // Neither confirms nor cancels the form (S15).
                      event.preventDefault()
                      finishRename(event.key === "Enter")
                    }}
                  />
                  <div className="flex shrink-0 gap-2">
                    <RowButton
                      icons={icons}
                      Icon={CheckIcon}
                      word={t("roadmaps.edit.tags.update")}
                      subject={tag}
                      onClick={() => {
                        finishRename(true)
                      }}
                    />
                    <RowButton
                      icons={icons}
                      Icon={XIcon}
                      word={t("roadmaps.edit.tags.cancelRename")}
                      subject={t("roadmaps.edit.tags.cancelRenameSubject", {
                        tag,
                      })}
                      onClick={() => {
                        finishRename(false)
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <Badge className="min-w-0 shrink justify-start text-left">
                    {tag}
                  </Badge>
                  <div className="flex shrink-0 gap-2">
                    <RowButton
                      icons={icons}
                      Icon={PencilIcon}
                      word={t("roadmaps.edit.tags.rename")}
                      subject={tag}
                      data-tag-control="rename"
                      onClick={() => {
                        startRename(tag)
                      }}
                    />
                    <RowButton
                      icons={icons}
                      Icon={Trash2Icon}
                      word={t("roadmaps.edit.tags.remove")}
                      subject={tag}
                      data-tag-control="remove"
                      onClick={() => {
                        remove(tag)
                      }}
                    />
                  </div>
                </>
              )}
            </li>
          ))}
          <RowProbe
            tags={tags}
            words={[
              t("roadmaps.edit.tags.rename"),
              t("roadmaps.edit.tags.remove"),
            ]}
          />
        </ul>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={addId} className="text-body-xs">
          {t("roadmaps.edit.tags.add")}
        </Label>
        <div className="flex gap-2">
          <Input
            ref={focusOnOpen}
            id={addId}
            value={draft.adding}
            autoComplete="off"
            autoCapitalize="off"
            onChange={(event) => {
              const { value } = event.target
              // A comma ends a tag, however it was typed (S7).
              if (endsATag(value)) add(value)
              else onApply(tags, { ...draft, adding: value })
            }}
            onPaste={(event) => {
              // A one-line field drops a pasted line break, which ends a tag too.
              const pasted = event.clipboardData.getData("text")
              if (!endsATag(pasted)) return
              event.preventDefault()
              // Pasted where the browser would have: over the selection, at the caret.
              const { value, selectionStart, selectionEnd } =
                event.currentTarget
              const start = selectionStart ?? value.length
              add(
                value.slice(0, start) +
                  pasted +
                  value.slice(selectionEnd ?? start),
              )
            }}
            onKeyDown={(event) => {
              // With nothing typed, Enter confirms the form, as in its other fields.
              if (event.key !== "Enter" || typed === "") return
              event.preventDefault()
              add(draft.adding)
            }}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (typed !== "") add(draft.adding)
              addField()?.focus()
            }}
          >
            {t("roadmaps.edit.tags.addButton")}{" "}
            <span className="sr-only">
              {t("roadmaps.edit.tags.addButtonSubject")}
            </span>
          </Button>
        </div>
      </div>
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-1.5 text-body-xs",
          (text === "" || quiet) && "sr-only",
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
              undoRemove(message.tag, message.index)
            }}
          >
            {t("roadmaps.edit.tags.undoRemove")}{" "}
            <span className="sr-only">
              {t("roadmaps.edit.tags.undoRemoveSubject", { tag: message.tag })}
            </span>
          </Button>
        )}
      </div>
      {anyOffered && (
        <div className="flex flex-col gap-1.5">
          <p id={elsewhereId} className="text-body-xs font-bold">
            {t("roadmaps.edit.tags.elsewhere")}
          </p>
          {offered.length > 0 ? (
            <ul
              ref={offers}
              aria-labelledby={elsewhereId}
              className="flex flex-wrap gap-2"
            >
              {offered.map(({ tag, count }, index) => (
                <li key={tag} className="flex max-w-full">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    aria-label={t("roadmaps.edit.tags.offer", { tag, count })}
                    data-tag-control="offer"
                    className="h-auto min-h-8 max-w-full py-1 text-left wrap-anywhere whitespace-normal"
                    onClick={() => {
                      add(tag)
                      focusControl(offers, "offer", index)
                    }}
                  >
                    <PlusIcon data-icon="inline-start" aria-hidden="true" />
                    {tag}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body-xs text-muted-foreground">
              {t("roadmaps.edit.tags.noMatch", { typed })}
            </p>
          )}
        </div>
      )}
    </>
  )
}

/** What the status line says for `message`. */
function messageText(message: Message, t: TFunction): string {
  switch (message.kind) {
    case "notes":
      return [
        ...(message.added.length > 0
          ? [t("roadmaps.edit.tags.added", { tags: message.added.join(", ") })]
          : []),
        ...message.notes.map(({ kind, typed, tag }) =>
          t(`roadmaps.edit.tags.notes.${kind}`, { typed, tag }),
        ),
      ].join(" ")
    case "added":
      return t("roadmaps.edit.tags.added", { tags: message.tags.join(", ") })
    case "removed":
      return t("roadmaps.edit.tags.removed", { tag: message.tag })
    case "putBack":
      return t("roadmaps.edit.tags.putBack", { tag: message.tag })
  }
}
