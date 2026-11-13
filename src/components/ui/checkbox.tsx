// Deviates from upstream shadcn (ADR-010): imports cn from @/lib/utils. The look is
// DHCW's checkbox (src/components/forms/_checkboxes.scss at the pinned release): a 40px
// square with the text input's 2px --input border, square corners and background, a
// tick in the text colour when checked, and the `focus-ring` on focus. The root is a
// `<span>`, so its disabled state is `data-disabled`, not `:disabled`. Upstream's sizes,
// tints, rings and `dark:` overrides go.
import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox"
import { CheckIcon } from "lucide-react"
import { cn } from "@/lib/utils"

function Checkbox({ className, ...props }: CheckboxPrimitive.Root.Props) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-none border-2 border-input bg-background text-foreground outline-none focus-visible:focus-ring data-disabled:cursor-not-allowed data-disabled:bg-muted",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center [&>svg]:size-7"
      >
        <CheckIcon aria-hidden="true" strokeWidth={3.5} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
