import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

/**
 * DHCW's inset text: a block of supporting text set off by a thick left border (the
 * `nhsw-inset-text` of the pinned release). Use it for a passage that belongs to the page
 * but is not its main flow, such as a note about where the data comes from.
 */
export function InsetText({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="inset-text"
      className={cn(
        "max-w-2xl border-l-8 border-input py-4 pr-4 pl-6 text-body [&>:last-child]:mb-0",
        className,
      )}
      {...props}
    />
  )
}
