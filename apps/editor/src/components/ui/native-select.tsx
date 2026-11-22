// Deviates from upstream shadcn (ADR-010): imports cn from @/lib/utils. The look is
// DHCW's select (src/components/forms/_select.scss at the pinned release): the text
// input's border, corners, text and focus (`inputClasses`), at least 40px tall and 12rem
// wide from tablet, with room on the right for the chevron. Upstream's sizes, tints and
// `dark:` overrides go, and options keep the platform's own colours.
import * as React from "react"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"

import { inputClasses } from "./input"

function NativeSelect({
  className,
  ...props
}: Omit<React.ComponentProps<"select">, "size" | "multiple">) {
  return (
    <div
      className={cn("group/native-select relative w-fit max-w-full", className)}
      data-slot="native-select-wrapper"
    >
      <select
        data-slot="native-select"
        className={cn(
          inputClasses,
          "min-h-10 cursor-pointer appearance-none pr-9 disabled:cursor-not-allowed sm:min-w-48",
        )}
        {...props}
      />
      <ChevronDownIcon
        className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-foreground group-has-[select:disabled]/native-select:text-muted-foreground"
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  )
}

function NativeSelectOption({ ...props }: React.ComponentProps<"option">) {
  return <option data-slot="native-select-option" {...props} />
}

export { NativeSelect, NativeSelectOption }
