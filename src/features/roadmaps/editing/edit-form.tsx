import {
  useEffect,
  useId,
  useRef,
  useState,
  type SubmitEvent,
  type KeyboardEvent,
} from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"

import { RoadmapSwatch } from "../components/roadmap-swatch"

/** One choice of a field chosen from a list. */
export interface EditFormOption {
  value: string
  label: string
  /** Its colour, shown beside the field while it is chosen; `null` for none. */
  colour?: string | null
}

/** One field of an edit form, in the order the form shows it. */
export interface EditFormField<F extends string> {
  name: F
  label: string
  /** A text area, for text with line breaks; otherwise one line. */
  multiline: boolean
  /** Chosen from these, in this order, instead of typed (STY-028). */
  options?: readonly EditFormOption[]
  /** Shown as `text`, not edited, with a notice of why (STY-028 S6). */
  fixed?: { text: string; notice: string }
}

export interface EditFormProps<F extends string> {
  /** The fields, the first of which is the title: required, and focused on opening. */
  fields: readonly EditFormField<F>[]
  /** Each field's value as the form opens: the English, pending or not. */
  initial: Record<F, string>
  /** The id of the heading naming what is edited. */
  labelledBy: string
  /**
   * Confirms the form, with each value changed from `initial` (trimmed at its ends, as
   * the comparison is): a field left as it opened is no edit, whatever has been read
   * since.
   */
  onDone: (values: Partial<Record<F, string>>) => void
  onCancel: () => void
}

/**
 * The form an item or the roadmap's own text turns into for editing (STY-025 S1, S4,
 * S5): a labelled field each, typed or chosen from a list (STY-028), or shown read-only
 * when it can't be changed, then "Done" to keep the values pending and Cancel (or Escape)
 * to leave them. The title is required: confirming without one keeps the form open with
 * an error linked to it. Writes nothing; the caller keeps the values pending.
 */
export function EditForm<F extends string>({
  fields,
  initial,
  labelledBy,
  onDone,
  onCancel,
}: EditFormProps<F>) {
  const { t } = useTranslation()
  const id = useId()
  const [opened] = useState(initial)
  const [values, setValues] = useState(initial)
  const [titleMissing, setTitleMissing] = useState(false)
  const titleRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null)
  const [title] = fields
  const errorId = `${id}-error`

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmed = Object.fromEntries(
      fields.map(({ name }) => [name, values[name].trim()]),
    ) as Record<F, string>
    if (title && trimmed[title.name] === "") {
      setTitleMissing(true)
      titleRef.current?.focus()
      return
    }
    onDone(
      Object.fromEntries(
        fields.flatMap(({ name }) =>
          trimmed[name] === opened[name].trim() ? [] : [[name, trimmed[name]]],
        ),
      ) as Partial<Record<F, string>>,
    )
  }
  const escape = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Escape") return
    event.preventDefault()
    onCancel()
  }

  return (
    // Escape is a shortcut for Cancel, which is a button in the form.
    // eslint-disable-next-line jsx-a11y-x/no-noninteractive-element-interactions
    <form
      aria-labelledby={labelledBy}
      noValidate
      onSubmit={submit}
      onKeyDown={escape}
      className="flex flex-col gap-4"
    >
      {fields.map((field, index) => {
        const isTitle = index === 0
        const invalid = isTitle && titleMissing
        const controlId = `${id}-${field.name}`
        const change = (value: string) => {
          setValues((current) => ({ ...current, [field.name]: value }))
        }
        if (field.fixed) {
          return (
            <div key={field.name} className="flex flex-col gap-1.5">
              <p className="font-bold">{field.label}</p>
              <p>{field.fixed.text}</p>
              <p className="text-muted-foreground">{field.fixed.notice}</p>
            </div>
          )
        }
        if (field.options) {
          const chosen = field.options.find(
            ({ value }) => value === values[field.name],
          )
          const coloured = field.options.some(
            ({ colour }) => colour !== undefined,
          )
          return (
            <div key={field.name} className="flex flex-col gap-1.5">
              <Label htmlFor={controlId}>{field.label}</Label>
              <div className="flex items-stretch gap-2.5">
                {coloured && <RoadmapSwatch colour={chosen?.colour ?? null} />}
                <NativeSelect
                  id={controlId}
                  value={values[field.name]}
                  onChange={(event) => {
                    change(event.target.value)
                  }}
                >
                  {field.options.map((option) => (
                    <NativeSelectOption key={option.value} value={option.value}>
                      {option.label}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
            </div>
          )
        }
        const Control = field.multiline ? Textarea : Input
        return (
          <div key={field.name} className="flex flex-col gap-1.5">
            <Label htmlFor={controlId}>{field.label}</Label>
            {invalid && (
              <p id={errorId} className="font-bold text-destructive">
                <span className="sr-only">
                  {t("roadmaps.edit.errorPrefix")}
                </span>{" "}
                {t("roadmaps.edit.titleRequired")}
              </p>
            )}
            <Control
              ref={isTitle ? titleRef : undefined}
              id={controlId}
              value={values[field.name]}
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? errorId : undefined}
              onChange={(event) => {
                change(event.target.value)
              }}
            />
          </div>
        )
      })}
      <div className="flex flex-wrap gap-3">
        <Button type="submit">{t("roadmaps.edit.done")}</Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  )
}
