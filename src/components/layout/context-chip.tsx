import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export interface ContextChipProps {
  /** A glyph for the square; it is hidden from assistive technology. */
  icon: ReactNode
  /** The chip's text, which says everything the icon does. */
  children: ReactNode
  className?: string
}

/**
 * A small bordered chip that says where the user is or what they are looking at, as
 * DHCW's dashboard chip: 40px high, with a square in the link blue holding the icon. The
 * icon is decoration, so the text must carry the meaning.
 */
export function ContextChip({ icon, children, className }: ContextChipProps) {
  return (
    <p
      data-slot="context-chip"
      className={cn(
        "inline-flex min-h-10 max-w-full items-center gap-2 rounded-lg border py-1 pr-3 pl-1 text-left text-body-xs",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-link text-background [&_svg]:size-5"
      >
        {icon}
      </span>
      <span className="min-w-0 text-pretty">{children}</span>
    </p>
  )
}
