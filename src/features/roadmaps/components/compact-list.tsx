import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

/**
 * A list of the compact view's rows, one under another in one bordered box, a rule
 * between each (STY-067): the rows of a placement and their skeleton alike. A container
 * of its own, so a moved mark's label is cut by the list's width (STY-071 D6).
 */
export function CompactList({ className, ...props }: ComponentProps<"ul">) {
  return (
    // Holding no pinned bar: a size container can contain them.
    <div className="@container">
      <ul
        className={cn("border bg-card text-card-foreground", className)}
        {...props}
      />
    </div>
  )
}
