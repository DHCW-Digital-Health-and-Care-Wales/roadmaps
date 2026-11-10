import { MapIcon } from "lucide-react"

import { cn } from "@/lib/utils"

/** The roadmap glyph on DHCW's blue tag tint, shared by cards and the detail header. */
export function RoadmapIcon({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-lg bg-status-info-bg text-status-info-fg [&_svg]:size-5",
        className,
      )}
    >
      <MapIcon />
    </span>
  )
}
