import { Link } from "@tanstack/react-router"
import { ChevronLeftIcon } from "lucide-react"
import type { ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"

import { textLinkClasses } from "./text-link-classes"

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
        "inline-flex items-center gap-1 text-body-xs",
        textLinkClasses,
        className,
      )}
      {...props}
    >
      <ChevronLeftIcon aria-hidden="true" className="size-4 shrink-0" />
      {children}
    </Link>
  )
}
