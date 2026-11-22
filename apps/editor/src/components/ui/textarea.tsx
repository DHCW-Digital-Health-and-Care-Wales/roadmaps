// Deviates from upstream shadcn (ADR-010): imports cn from @/lib/utils and shares the
// DHCW text input's look (`inputClasses`); it grows with its content from three lines.
import * as React from "react"
import { cn } from "@/lib/utils"

import { inputClasses } from "./input"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(inputClasses, "field-sizing-content min-h-24", className)}
      {...props}
    />
  )
}

export { Textarea }
