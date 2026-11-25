import type { ReactNode } from "react"

import { Label } from "@/components/ui/label"

import { FieldError } from "./field-error"

/** What a field's control takes to be named, described and marked by the field. */
interface FormFieldControl {
  id: string
  "aria-invalid": true | undefined
  "aria-describedby": string | undefined
}

export interface FormFieldProps {
  /** The control's id, which the label, the hint and the message are tied to. */
  id: string
  label: string
  /** Said of the field under its label, whatever it holds. */
  hint?: ReactNode
  /** What is wrong with the field, as an instruction; shown above its control. */
  error?: string | undefined
  /** The control, given what ties it to the field. */
  children: (control: FormFieldControl) => ReactNode
}

/**
 * One field of a form: its label, then a hint, then what is wrong with it, then its
 * control, which the hint and the message describe and the message marks invalid.
 */
export function FormField({
  id,
  label,
  hint,
  error,
  children,
}: FormFieldProps) {
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(
    (each) => each !== null,
  )
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {Boolean(hint) && (
        <p id={hintId} className="text-muted-foreground">
          {hint}
        </p>
      )}
      {error && <FieldError id={errorId}>{error}</FieldError>}
      {children({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby":
          describedBy.length > 0 ? describedBy.join(" ") : undefined,
      })}
    </div>
  )
}
