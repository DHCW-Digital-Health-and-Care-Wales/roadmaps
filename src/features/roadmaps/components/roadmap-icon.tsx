import { MapIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** The roadmap glyph on a soft brand tile, shared by cards and the detail header. */
export function RoadmapIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand ring-1 ring-brand/15 ring-inset [&_svg]:size-5",
        className,
      )}
    >
      <MapIcon />
    </span>
  )
}
