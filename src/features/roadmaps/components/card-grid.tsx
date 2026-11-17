import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

/**
 * A list of cards in one, two, then three columns, 16px apart and 20px from `sm`, DHCW's
 * card group gutter: the roadmap cards, the item cards and their skeletons alike. The
 * columns follow the room the page has, not the screen's width, so beside the shell's
 * open navigation a 1280px desktop has two, and folded to its rail three (STY-054 D5).
 */
export function CardGrid({ className, ...props }: ComponentProps<"ul">) {
  return (
    // A container of its own, holding no pinned bar: a size container can contain them.
    <div className="@container">
      <ul
        className={cn(
          "grid grid-cols-1 gap-4 sm:gap-5 @xl:grid-cols-2 @5xl:grid-cols-3",
          className,
        )}
        {...props}
      />
    </div>
  )
}
