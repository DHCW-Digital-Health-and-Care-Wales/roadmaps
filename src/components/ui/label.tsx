// Deviates from upstream shadcn (ADR-010): imports cn from @/lib/utils. The look is
// DHCW's label (src/components/forms/_label.scss at the pinned release): bold body text
// above its field.
import * as React from "react"
import { cn } from "@/lib/utils"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    // `htmlFor` comes through the props, as upstream's does.
    // eslint-disable-next-line jsx-a11y-x/label-has-associated-control
    <label
      data-slot="label"
      className={cn("block text-body font-bold", className)}
      {...props}
    />
  )
}

export { Label }
