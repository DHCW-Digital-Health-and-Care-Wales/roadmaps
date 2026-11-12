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
import { Label } from "@/components/ui/label"
import type {
  FamilyField,
  FamilyInput,
  FamilyInputProblems,
} from "@/domain/roadmap/family-changes"

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
  /** Whether saving is available: only while connected. */
  available: boolean
  onChange: (values: FamilyInput) => void
  onSubmit: () => void
  onCancel: () => void
}

const FIELDS: readonly FamilyField[] = ["name", "colour"]

/**
 * A family's English name and colour, with a swatch of the colour as typed, each field's
 * problem linked to it, then the save button and Cancel (or Escape). Checks nothing
 * itself: the caller checks on submit and passes the problems back.
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

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!busy && available) onSubmit()
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
        const controlId = `${id}-${field}`
        const errorId = `${controlId}-error`
        const hintId = `${controlId}-hint`
        const problem = problems[field]
        const describedBy = [
          field === "colour" ? hintId : null,
          problem ? errorId : null,
        ].filter((each) => each !== null)
        const control = (
          <Input
            ref={field === "name" ? nameRef : colourRef}
            id={controlId}
            value={values[field]}
            autoComplete="off"
            spellCheck={field === "name"}
            className={field === "colour" ? "max-w-40" : undefined}
            aria-invalid={problem ? true : undefined}
            aria-describedby={
              describedBy.length > 0 ? describedBy.join(" ") : undefined
            }
            onChange={(event) => {
              onChange({ ...values, [field]: event.target.value })
            }}
          />
        )
        return (
          <div key={field} className="flex flex-col gap-1.5">
            <Label htmlFor={controlId}>
              {t(`roadmaps.families.form.${field}`)}
            </Label>
            {field === "colour" && (
              <p id={hintId} className="text-muted-foreground">
                {t("roadmaps.families.form.colourHint")}
              </p>
            )}
            {problem && (
              <p id={errorId} className="font-bold text-destructive">
                <span className="sr-only">
                  {t("roadmaps.edit.errorPrefix")}
                </span>{" "}
                {t(`roadmaps.families.form.errors.${problem}`)}
              </p>
            )}
            {field === "colour" ? (
              <div className="flex items-stretch gap-2.5">
                <RoadmapSwatch colour={values.colour.trim().toLowerCase()} />
                {control}
              </div>
            ) : (
              control
            )}
          </div>
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
