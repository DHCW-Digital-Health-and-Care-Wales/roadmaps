import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

/** The border's colour: neutral, or a status's for a passage about one. */
const toneClasses = {
  neutral: "border-input",
  info: "border-status-info-border",
} as const

export interface InsetTextProps extends ComponentProps<"div"> {
  tone?: keyof typeof toneClasses
}

/**
 * DHCW's inset text: a block of supporting text set off by a thick left border (the
 * `nhsw-inset-text` of the pinned release). Use it for a passage that belongs to the page
 * but is not its main flow, such as a note about where the data comes from.
 */
export function InsetText({
  tone = "neutral",
  className,
  ...props
}: InsetTextProps) {
  return (
    <div
      data-slot="inset-text"
      className={cn(
        "max-w-2xl border-l-8 py-4 pr-4 pl-6 text-body [&>:last-child]:mb-0",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  )
}
