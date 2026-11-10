import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

/**
 * DHCW's wide container (`nhsw-fluid-container` in a 1200px page): at most 1200px, with 16px
 * margins on a phone and 40px from desktop. The header, banner, footer and every page sit
 * in one so their left edges line up.
 */
export function PageContainer({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="page-container"
      className={cn("mx-auto w-full max-w-300 px-4 md:px-10", className)}
      {...props}
    />
  )
}
