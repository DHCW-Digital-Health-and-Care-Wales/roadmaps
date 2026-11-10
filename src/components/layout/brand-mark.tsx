import { ChartGanttIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** The product icon: the favicon's glyph on a tile in the primary colour. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10",
        className,
      )}
    >
      <ChartGanttIcon className="size-4" strokeWidth={2.25} />
    </span>
  )
}
