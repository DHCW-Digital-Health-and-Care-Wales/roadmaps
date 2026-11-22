// Deviates from upstream shadcn (ADR-010): imports cn from @/lib/utils. The look is
// DHCW's text input (src/components/forms/_input.scss at the pinned release): a 2px
// --input border, square corners, body text, at least 40px tall, the `focus-ring` on
// focus and a destructive border when `aria-invalid`.
import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

/** Shared with `Textarea`, so the two fields look alike. */
export const inputClasses =
  "w-full min-w-0 rounded-none border-2 border-input bg-background p-2 text-body text-foreground outline-none placeholder:text-muted-foreground focus-visible:focus-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-destructive"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(inputClasses, "min-h-10", className)}
      {...props}
    />
  )
}

export { Input }
