import { Link } from "@tanstack/react-router"
import { ChevronLeftIcon } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * DHCW's back link: a text link with a left chevron, for going up one level. It is a
 * real link (not a button-styled one, so it keeps its link role) and takes the router
 * `Link`'s props, `to` first.
 */
export function BackLink({
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof Link>, "children"> & { children: ReactNode }) {
  return (
    <Link
      data-slot="back-link"
      className={cn(
        "inline-flex items-center gap-1 text-body-xs text-link underline outline-none hover:text-link-hover hover:no-underline focus-visible:focus-link",
        className,
      )}
      {...props}
    >
      <ChevronLeftIcon aria-hidden="true" className="size-4 shrink-0" />
      {children}
    </Link>
  )
}
