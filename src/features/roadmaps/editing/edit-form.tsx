import {
  useEffect,
  useId,
  useReducer,
  useRef,
  useState,
  type SubmitEvent,
  type ReactNode,
} from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DialogClose, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { isCalendarDate } from "@/domain/roadmap/calendar-date"
import {
  type DetailLine,
  detailsOf,
  detailsValue,
} from "@/domain/roadmap/item-details"
import { tagsOf, tagsValue } from "@/domain/roadmap/roadmap-changes"

import { FormField } from "../components/form-field"
import { ChoiceField, type ChoiceOption } from "./choice-field"
import { DetailsField } from "./details-field"
import { FixedField } from "./fixed-field"
import type { TagInUse } from "./item-tags"
import { OpeningField } from "./opening-field"
import { TagsField } from "./tags-field"

/** One field of an edit form, in the order the form shows it. */
export interface EditFormField<F extends string> {
  name: F
  label: string
  /** A text area, for text with line breaks; otherwise one line. */
  multiline: boolean
  /**
   * Typed or chosen from `options`, it must hold a value: what the form says at the
   * field when it holds none, as it does of a title (STY-025 S4, STY-046 S2).
   */
  required?: RequiredError
  /** Chosen from these, in this order, instead of typed (STY-028). */
  options?: readonly ChoiceOption[]
  /**
   * With `options`, any number of them chosen, as checkboxes, instead of one (STY-034):
   * the field's value holds the chosen ones' values as `ofValue` reads it and `toValue`
   * writes it. The checkboxes open on request (STY-038): shut, the field shows
   * `summary` of the chosen ones on one line, or `none` when that is empty, beside a
   * button named with `subject` ("Change organisations").
   */
  many?: {
    ofValue: (value: string) => readonly string[]
    toValue: (chosen: readonly string[]) => string
    summary: (chosen: readonly string[]) => string
    none: string
    subject: string
  }
  /** Said of a checkbox group as a whole, under its label, shut or open (STY-038 S5). */
  hint?: string
  /**
   * An item's tags (STY-037), edited in a `TagsField`, which opens on request: the
   * field's value holds them as `tagsValue` gives them, with whatever is half done in
   * the field kept. `inUse` are the tags the roadmap's other items carry, to offer.
   */
  tags?: { inUse: readonly TagInUse[] }
  /**
   * An item's details (STY-039), edited in a `DetailsField`, which opens on request:
   * the field's value holds them as `detailsValue` gives them, with a detail still
   * being written kept. `asListed` are the details as the card listed them when the
   * form opened, shown until the field is first opened or the form holds others.
   */
  details?: { asListed: readonly DetailLine[] }
  /** Held at its value, as while its options are read. */
  disabled?: boolean
  /** Shown as `text`, not edited, with a notice of why (STY-028 S6, STY-037 S20). */
  fixed?: { text: ReactNode; notice: string }
  /**
   * A calendar date, `YYYY-MM-DD` or `""` for none, in the browser's own date input
   * (STY-036 D8): none after `today()`, which "Today" fills in. Read when it is needed,
   * so a form left open past midnight takes the new day.
   */
  date?: { today: () => string }
}

/** Why a field keeps the form open: its message's key under `roadmaps.edit`. */
type FieldError =
  "titleRequired" | "placementRequired" | "dateInFuture" | "dateInvalid"

/** Why a field that must hold a value keeps the form open while it holds none. */
export type RequiredError = Extract<
  FieldError,
  "titleRequired" | "placementRequired"
>

/** A form's values as it confirms them: each changed since it opened. */
type ChangedValues<F extends string> = Partial<Record<F, string>>

export interface EditFormProps<F extends string> {
  /** The fields, in order; the dialog gives the first its focus. */
  fields: readonly EditFormField<F>[]
  /** Each field's value as the form opens: the English, pending or not. */
  initial: Record<F, string>
  /** The id of the heading naming what is edited. */
  labelledBy: string
  /**
   * Confirms the form, with each value changed from `initial` (trimmed at its ends, as
   * the comparison is): a field left as it opened is no edit, whatever has been read
   * since, and neither is one that is `fixed` when the form is confirmed.
   */
  onDone: (values: ChangedValues<F>) => void
  /** What the button that confirms the form says, if not "Done". */
  confirmLabel?: string | undefined
  /**
   * A second button that confirms the form, after the first: its label, and what it
   * is given in place of `onDone` ("Add and start another", STY-046 S4).
   */
  another?:
    { label: string; onDone: (values: ChangedValues<F>) => void } | undefined
  /** Said under the fields, above the buttons. */
  note?: ReactNode
  /**
   * Puts focus in the first field as the form is drawn. A dialog gives the form it
   * opens on its first focus (`FormDialog`); a form drawn in an open dialog, in place
   * of one just confirmed, takes it itself.
   */
  takesFocus?: boolean | undefined
}

/**
 * The editing form of the item dialog (STY-025 S1, S4; STY-044) and of the roadmap
 * dialog (STY-025 S5, STY-043): a labelled field each, typed, chosen from a list
 * (STY-028), ticked from one that opens on request (STY-034, STY-038), tags added,
 * renamed and removed (STY-037), details written as an outline (STY-039) or a date
 * picked (STY-036), or shown read-only when it can't be changed, then "Done" to keep the
 * values pending and the dialog's Cancel to leave them. The item dialog's adding form is
 * this one too, over an item with nothing in it (STY-046): its buttons are named for
 * adding, and a note says when the item is published. Its first focus, Escape and
 * closing are the dialog's (`FormDialog`). A field that is `required` holds a value, as
 * a title does, and a date is a real one and not after today: confirming otherwise keeps
 * the form open with an error linked to each field, focusing the first. Writes nothing;
 * the caller keeps the values pending.
 */
export function EditForm<F extends string>({
  fields,
  initial,
  labelledBy,
  onDone,
  confirmLabel,
  another,
  note,
  takesFocus = false,
}: EditFormProps<F>) {
  const { t } = useTranslation()
  const id = useId()
  const [opened] = useState(initial)
  const [values, setValues] = useState(initial)
  const [errors, setErrors] = useState<Partial<Record<F, FieldError>>>({})
  // Draws the form again, so a date field's limit is today's when its picker opens.
  const [, redraw] = useReducer((count: number) => count + 1, 0)
  const controls = useRef(new Map<F, FieldControl>())
  const controlRef = (name: F) => (control: FieldControl | null) => {
    if (control) controls.current.set(name, control)
    else controls.current.delete(name)
  }
  const firstField = fields[0]?.name
  useEffect(() => {
    if (takesFocus && firstField !== undefined) {
      controls.current.get(firstField)?.focus()
    }
  }, [takesFocus, firstField])

  /**
   * The values to confirm, each changed since the form opened; or `null`, with each
   * field's error shown and focus on the first, when a field keeps the form open.
   */
  const confirmed = (): ChangedValues<F> | null => {
    const trimmed = Object.fromEntries(
      fields.map(({ name }) => [name, values[name].trim()]),
    ) as Record<F, string>
    const found = Object.fromEntries(
      fields.flatMap((field) => {
        const error = fieldError(field, {
          value: trimmed[field.name],
          opened: opened[field.name].trim(),
          badInput:
            controls.current.get(field.name)?.validity.badInput ?? false,
        })
        return error ? [[field.name, error]] : []
      }),
    ) as Partial<Record<F, FieldError>>
    setErrors(found)
    const invalid = fields.find(({ name }) => found[name])
    if (invalid) {
      controls.current.get(invalid.name)?.focus()
      return null
    }
    return Object.fromEntries(
      // A field shown read-only is no edit, whatever it held before it was fixed.
      fields.flatMap(({ name, fixed }) =>
        fixed || trimmed[name] === opened[name].trim()
          ? []
          : [[name, trimmed[name]]],
      ),
    ) as ChangedValues<F>
  }
  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = confirmed()
    if (values) onDone(values)
  }

  return (
    <form
      aria-labelledby={labelledBy}
      noValidate
      onSubmit={submit}
      className="flex flex-col gap-4"
    >
      {fields.map((field) => {
        const controlId = `${id}-${field.name}`
        const change = (value: string) => {
          setValues((current) => ({ ...current, [field.name]: value }))
        }
        const error: FieldError | undefined = errors[field.name]
        const message = error && t(`roadmaps.edit.${error}`)
        if (field.fixed) {
          return (
            <FixedField key={field.name} label={field.label} {...field.fixed} />
          )
        }
        if (field.options && field.many) {
          const { options } = field
          const { ofValue, toValue, summary, none, subject } = field.many
          const chosen = ofValue(values[field.name])
          const ticked = new Set(chosen)
          const toggle = (option: string, checked: boolean) => {
            setValues((current) => {
              const next = new Set(ofValue(current[field.name]))
              if (checked) next.add(option)
              else next.delete(option)
              return { ...current, [field.name]: toValue([...next]) }
            })
          }
          return (
            <OpeningField
              key={field.name}
              label={field.label}
              subject={subject}
              summary={summary(chosen) || null}
              none={none}
              hint={field.hint}
            >
              {(focusOnOpen) =>
                options.map((option, index) => (
                  <label
                    key={option.value}
                    className="flex min-h-10 cursor-pointer items-center gap-3"
                  >
                    <Checkbox
                      ref={index === 0 ? focusOnOpen : undefined}
                      checked={ticked.has(option.value)}
                      disabled={field.disabled}
                      onCheckedChange={(checked) => {
                        toggle(option.value, checked)
                      }}
                    />
                    <span className="min-w-0 wrap-break-word">
                      {option.label}
                    </span>
                  </label>
                ))
              }
            </OpeningField>
          )
        }
        if (field.tags) {
          return (
            <TagsField
              key={field.name}
              label={field.label}
              // What the form holds, so a field drawn again shows what Done keeps.
              initial={tagsOf(values[field.name])}
              inUse={field.tags.inUse}
              onChange={(tags) => {
                change(tagsValue(tags))
              }}
            />
          )
        }
        if (field.details) {
          return (
            <DetailsField
              key={field.name}
              label={field.label}
              // What the form holds, so a field drawn again shows what Done keeps.
              initial={detailsOf(values[field.name])}
              asListed={
                values[field.name] === opened[field.name]
                  ? field.details.asListed
                  : null
              }
              onChange={(details) => {
                change(detailsValue(details))
              }}
            />
          )
        }
        if (field.options) {
          return (
            <ChoiceField
              key={field.name}
              ref={controlRef(field.name)}
              id={controlId}
              label={field.label}
              options={field.options}
              value={values[field.name]}
              disabled={field.disabled}
              error={message}
              onChange={change}
            />
          )
        }
        const { date } = field
        const Control = field.multiline ? Textarea : Input
        return (
          <FormField
            key={field.name}
            id={controlId}
            label={field.label}
            error={message}
          >
            {(control) =>
              date ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    ref={controlRef(field.name)}
                    type="date"
                    max={date.today()}
                    value={values[field.name]}
                    className="w-auto"
                    {...control}
                    onFocus={redraw}
                    onChange={(event) => {
                      change(event.target.value)
                    }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      change(date.today())
                    }}
                  >
                    {t("roadmaps.edit.today")}
                  </Button>
                </div>
              ) : (
                <Control
                  ref={controlRef(field.name)}
                  value={values[field.name]}
                  {...control}
                  onChange={(event) => {
                    change(event.target.value)
                  }}
                />
              )
            }
          </FormField>
        )
      })}
      {note}
      <DialogFooter>
        <Button type="submit">{confirmLabel ?? t("roadmaps.edit.done")}</Button>
        {another && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const values = confirmed()
              if (values) another.onDone(values)
            }}
          >
            {another.label}
          </Button>
        )}
        <DialogClose type="button">{t("common.cancel")}</DialogClose>
      </DialogFooter>
    </form>
  )
}

/** A control the form focuses: a field's input, text area or select. */
type FieldControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

/**
 * What keeps `field` from being confirmed with `value`, trimmed: a required field with
 * nothing in it, a date the browser couldn't read (a half-typed one reads as none), or a
 * date changed from `opened` to one after today. A date left as it opened is no edit, so
 * one already after today never holds up the other fields.
 */
function fieldError<F extends string>(
  field: EditFormField<F>,
  {
    value,
    opened,
    badInput,
  }: { value: string; opened: string; badInput: boolean },
): FieldError | null {
  if (field.required && value === "") return field.required
  if (!field.date) return null
  if (badInput || (value !== "" && !isCalendarDate(value))) {
    return "dateInvalid"
  }
  if (value === opened) return null
  // Both `YYYY-MM-DD`, so they compare as text.
  return value > field.date.today() ? "dateInFuture" : null
}
