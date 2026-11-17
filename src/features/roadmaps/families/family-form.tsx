import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type SubmitEvent,
} from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type {
  FamilyField,
  FamilyInput,
  FamilyInputProblems,
} from "@/domain/roadmap/family-changes"
import { useSessionAction } from "@/features/auth/session-action"

import { FormField } from "../components/form-field"
import { RoadmapSwatch } from "../components/roadmap-swatch"

export interface FamilyFormProps {
  labelledBy: string
  values: FamilyInput
  /** What the last attempt found wrong, each shown by its field (S6). */
  problems: FamilyInputProblems
  /** A field to move focus to: each new request moves it once. */
  focusRequest: { field: FamilyField } | null
  submitLabel: string
  busy: boolean
  /** Whether saving is available: only with a usable family list (S7). */
  available: boolean
  onChange: (values: FamilyInput) => void
  onSubmit: () => void
  onCancel: () => void
}

const FIELDS: readonly FamilyField[] = ["name", "colour"]

/**
 * A family's English name and colour, with a swatch of the colour as typed, each field's
 * problem linked to it, then the save button and Cancel (or Escape). Checks nothing
 * itself: the caller checks on submit and passes the problems back. Submitted after the
 * session has expired, it asks to reconnect first, then submits (STY-057).
 */
export function FamilyForm({
  labelledBy,
  values,
  problems,
  focusRequest,
  submitLabel,
  busy,
  available,
  onChange,
  onSubmit,
  onCancel,
}: FamilyFormProps) {
  const { t } = useTranslation()
  const id = useId()
  const nameRef = useRef<HTMLInputElement>(null)
  const colourRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    nameRef.current?.focus()
  }, [])

  useEffect(() => {
    if (focusRequest === null) return
    const ref = focusRequest.field === "name" ? nameRef : colourRef
    ref.current?.focus()
  }, [focusRequest])

  const save = useSessionAction(onSubmit)
  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!busy && available) save(event.nativeEvent.submitter)
  }
  const escape = (event: KeyboardEvent<HTMLFormElement>) => {
    if (event.key !== "Escape" || busy) return
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
      className="flex max-w-md flex-col gap-4"
    >
      {FIELDS.map((field) => {
        const problem = problems[field]
        return (
          <FormField
            key={field}
            id={`${id}-${field}`}
            label={t(`roadmaps.families.form.${field}`)}
            hint={field === "colour" && t("roadmaps.families.form.colourHint")}
            error={problem && t(`roadmaps.families.form.errors.${problem}`)}
          >
            {(control) => {
              const input = (
                <Input
                  ref={field === "name" ? nameRef : colourRef}
                  value={values[field]}
                  autoComplete="off"
                  // What is being saved stays what the form shows.
                  readOnly={busy}
                  spellCheck={field === "name"}
                  className={field === "colour" ? "max-w-40" : undefined}
                  {...control}
                  onChange={(event) => {
                    onChange({ ...values, [field]: event.target.value })
                  }}
                />
              )
              return field === "colour" ? (
                <div className="flex items-stretch gap-2.5">
                  <RoadmapSwatch colour={values.colour.trim().toLowerCase()} />
                  {input}
                </div>
              ) : (
                input
              )
            }}
          </FormField>
        )
      })}
      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          disabled={busy || !available}
          focusableWhenDisabled
          aria-busy={busy}
        >
          {submitLabel}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={onCancel}
        >
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  )
}
