import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

/**
 * A list of the compact view's rows, one under another in one bordered box, a rule
 * between each (STY-067): the rows of a placement and their skeleton alike.
 */
export function CompactList({ className, ...props }: ComponentProps<"ul">) {
  return (
    <ul
      className={cn("border bg-card text-card-foreground", className)}
      {...props}
    />
  )
}
