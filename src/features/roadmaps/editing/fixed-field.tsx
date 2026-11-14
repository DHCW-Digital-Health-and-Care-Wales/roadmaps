import type { ReactNode } from "react"

export interface FixedFieldProps {
  label: string
  text: ReactNode
  /** Why it can't be changed. */
  notice: string
}

/** A field shown as it is, not edited, with a notice of why (STY-028 S6, STY-037 S20). */
export function FixedField({ label, text, notice }: FixedFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="font-bold">{label}</p>
      {typeof text === "string" ? <p>{text}</p> : text}
      <p className="text-muted-foreground">{notice}</p>
    </div>
  )
}
