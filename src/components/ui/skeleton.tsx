// Deviates from upstream shadcn (ADR-010): imports cn from @/lib/utils; 4px corners
// (`rounded-lg`, DHCW's radius) for upstream's `rounded-md`.
import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-lg bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
