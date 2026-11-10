import { ChartGanttIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** The product icon: the favicon's tile, on a dark ground in both themes. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-indigo-300 shadow-sm ring-1 ring-black/5 dark:ring-white/10",
        className,
      )}
    >
      <ChartGanttIcon className="size-4" strokeWidth={2.25} />
    </span>
  )
}
