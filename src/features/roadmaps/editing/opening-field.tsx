import { useEffect, useId, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

export interface OpeningFieldProps {
  label: string
  /**
   * Names the field after its button's "Change", "Add" or "Close", for assistive
   * technology: "organisations".
   */
  subject: string
  /** What the field holds, shown on one line while it is shut; `null` for nothing. */
  summary: ReactNode
  /** Said in place of `summary` while the field holds nothing: "No organisations". */
  none: string
  /** Said of the field under its label, shut or open (STY-038 S5). */
  hint?: string | undefined
  /**
   * The field's controls, drawn only while it is open; `focusOnOpen` is the `ref` of
   * the one that takes focus as it opens. What they change is the caller's to hold, so
   * shutting the field keeps it.
   */
  children: (focusOnOpen: (control: HTMLElement | null) => void) => ReactNode
  /**
   * Called as the field is shut by its button, for a field that holds more than its
   * controls show as kept, such as text typed but not yet added (STY-037 S19).
   */
  onShut?: (() => void) | undefined
}

/**
 * A form field of many controls that opens on request (EPC-009, _A field that opens on
 * request_). Shut, as it always starts: its label, one line of what it holds and a
 * button, "Change", or "Add" while it holds nothing. Open: the button reads "Close" and
 * says the field is open, and the controls show in place, as a group named by the label,
 * with focus on the one the field names. Shutting leaves focus on the button.
 */
export function OpeningField({
  label,
  subject,
  summary,
  none,
  hint,
  children,
  onShut,
}: OpeningFieldProps) {
  const { t } = useTranslation()
  const id = useId()
  const labelId = `${id}-label`
  const hintId = hint ? `${id}-hint` : undefined
  const [open, setOpen] = useState(false)
  // The control is drawn only while the field is open, so it arrives as the field opens.
  const [control, focusOnOpen] = useState<HTMLElement | null>(null)
  useEffect(() => {
    control?.focus()
  }, [control])

  const action = open ? "close" : summary === null ? "add" : "change"
  return (
    <Collapsible
      open={open}
      onOpenChange={(opening) => {
        if (!opening) onShut?.()
        setOpen(opening)
      }}
      className="flex flex-col gap-1.5"
    >
      <div className="flex items-center justify-between gap-3">
        <p id={labelId} className="font-bold">
          {label}
        </p>
        <CollapsibleTrigger
          render={
            <Button
              type="button"
              variant="secondary"
              size="sm"
              aria-describedby={hintId}
            />
          }
        >
          {t(`roadmaps.edit.openingField.${action}`)}{" "}
          <span className="sr-only">{subject}</span>
        </CollapsibleTrigger>
      </div>
      {hint && (
        <p id={hintId} className="text-muted-foreground">
          {hint}
        </p>
      )}
      {!open &&
        (summary === null ? (
          <p className="text-muted-foreground">{none}</p>
        ) : (
          <div className="wrap-break-word">{summary}</div>
        ))}
      <CollapsibleContent
        render={
          <fieldset
            aria-labelledby={labelId}
            aria-describedby={hintId}
            className="flex min-w-0 flex-col gap-2.5"
          />
        }
      >
        {children(focusOnOpen)}
      </CollapsibleContent>
    </Collapsible>
  )
}
