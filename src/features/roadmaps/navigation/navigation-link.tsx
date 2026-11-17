import { createLink } from "@tanstack/react-router"
import type { ComponentProps, ReactNode } from "react"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

import { RoadmapSwatch } from "../components/roadmap-swatch"

/** What marks a destination beside its name, and alone in a rail. */
export type NavigationMark =
  /** A page's icon, shown in both forms. */
  | { icon: ReactNode }
  /** A roadmap's colour as a strip, and in a rail its initials in place of its title. */
  | { colour: string | null; initials: string }

// Its classes are the navigation's own, so the anchor takes none from a caller.
interface NavigationEntryProps extends Omit<
  ComponentProps<"a">,
  "children" | "className"
> {
  /** Folded to a rail: the mark, the name in a tooltip and, beyond the initials, read only. */
  rail: boolean
  name: string
  mark: NavigationMark
}

/**
 * The entry holding the current page is DHCW's active blue. The entry carries it, not
 * the link: on the link it would sort after the focus fill and hide it.
 */
const entryClasses = "rounded-lg has-[[aria-current=page]]:bg-sidebar-accent"

/**
 * A link on navy: white, DHCW's active blue on hover, yellow when focused, and bold for
 * the current page.
 */
function linkClasses(rail: boolean): string {
  return cn(
    "flex min-h-10 items-center gap-2 rounded-lg py-2 outline-none hover:bg-sidebar-accent focus-visible:focus-fill aria-[current=page]:font-bold",
    rail ? "justify-center px-1" : "px-2",
  )
}

/**
 * What the link shows: its mark and name; in a rail, its mark alone, a page's name read
 * after its icon and a roadmap's title after the initials that begin its name.
 */
function EntryLabel({
  rail,
  name,
  mark,
}: Pick<NavigationEntryProps, "rail" | "name" | "mark">) {
  if ("icon" in mark) {
    return (
      <>
        {mark.icon}
        <span className={rail ? "sr-only" : "min-w-0 wrap-break-word"}>
          {name}
        </span>
      </>
    )
  }
  return (
    <>
      <RoadmapSwatch colour={mark.colour} />
      {rail ? (
        <>
          {/* The initials shown begin its name, so speech input can say them (WCAG 2.5.3). */}
          <span className="text-body-xs font-bold">{mark.initials}</span>{" "}
          <span className="sr-only">{name}</span>
        </>
      ) : (
        <span className="min-w-0 wrap-break-word">{name}</span>
      )}
    </>
  )
}

/**
 * One destination of the shell's navigation, in its list's entry: its mark and name in
 * full; in a rail its mark, with its name in a tooltip as it is pointed at or focused.
 * Takes the router `Link`'s props, `to` first, and marks the current page as it does.
 */
function NavigationEntry({
  rail,
  name,
  mark,
  ...anchor
}: NavigationEntryProps) {
  const link = (
    <a {...anchor} className={linkClasses(rail)}>
      <EntryLabel rail={rail} name={name} mark={mark} />
    </a>
  )
  return (
    <li className={entryClasses}>
      {rail ? (
        <Tooltip>
          <TooltipTrigger render={link} />
          <TooltipContent side="right">{name}</TooltipContent>
        </Tooltip>
      ) : (
        link
      )}
    </li>
  )
}

export const NavigationLink = createLink(NavigationEntry)
