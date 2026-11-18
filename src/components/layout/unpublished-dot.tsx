import { cn } from "@/lib/utils"

/**
 * The dot that marks something with unpublished changes (STY-053 S2, STY-055 D1): shape
 * only, hidden from assistive technology, so what holds it says the same in words. The
 * caller picks its place, and a colour that suits the surface it sits on and stays
 * visible while its holder is focused.
 */
export function UnpublishedDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-slot="unpublished-dot"
      className={cn("size-2 shrink-0 rounded-full", className)}
    />
  )
}
