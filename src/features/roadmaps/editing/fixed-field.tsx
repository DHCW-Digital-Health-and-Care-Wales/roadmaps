import { useId, type ReactNode, type Ref } from "react"

import { FieldError } from "../components/field-error"

export interface FixedFieldProps {
  label: string
  text: ReactNode
  /** Why it can't be changed. */
  notice: string
  /**
   * What a form refused about the field. While it is given the field can take focus,
   * through `ref`, as a group named by its label and described by the message: it has
   * no control to take it.
   */
  error?: string | undefined
  ref?: Ref<HTMLDivElement>
}

/** A field shown as it is, not edited, with a notice of why (STY-028 S6, STY-037 S20). */
export function FixedField({
  label,
  text,
  notice,
  error,
  ref,
}: FixedFieldProps) {
  const id = useId()
  const labelId = `${id}-label`
  const errorId = `${id}-error`
  const refused = error
    ? ({
        role: "group",
        tabIndex: -1,
        "aria-labelledby": labelId,
        "aria-describedby": errorId,
      } as const)
    : {}
  return (
    <div
      ref={ref}
      {...refused}
      className="flex flex-col gap-1.5 outline-none focus-visible:focus-ring"
    >
      <p id={labelId} className="font-bold">
        {label}
      </p>
      {error && <FieldError id={errorId}>{error}</FieldError>}
      {typeof text === "string" ? <p>{text}</p> : text}
      <p className="text-muted-foreground">{notice}</p>
    </div>
  )
}
