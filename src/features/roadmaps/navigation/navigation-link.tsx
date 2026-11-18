import { createLink } from "@tanstack/react-router"
import type { ComponentProps, ReactElement, ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { UnpublishedDot } from "@/components/layout/unpublished-dot"
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
  /**
   * A roadmap's colour as a strip, and in a rail its initials in place of its title; a dot
   * after it while it has unpublished changes (STY-055 D1), which its name then says.
   */
  | {
      colour: string | null
      initials: string
      unpublished?: boolean
    }
  /** A number in a circle in a rail, and a dot beside the name in full. */
  | { count: number }

/** What every entry takes, a link or the text that stands where one cannot lead. */
interface NavigationEntryShape {
  /** Folded to a rail: the mark, the name in a tooltip and, beyond the initials, read only. */
  rail: boolean
  name: string
  mark: NavigationMark
}

// Its classes are the navigation's own, so the anchor takes none from a caller.
interface NavigationEntryProps
  extends
    Omit<ComponentProps<"a">, "children" | "className">,
    NavigationEntryShape {}

/**
 * The entry holding the current page is DHCW's active blue. The entry carries it, not
 * the link: on the link it would sort after the focus fill and hide it.
 */
const entryClasses = "rounded-lg has-[[aria-current=page]]:bg-sidebar-accent"

/** What a link and the text beside the links share: their size and place for the mark. */
function boxClasses(rail: boolean): string {
  return cn(
    "relative flex min-h-10 items-center gap-2 rounded-lg py-2",
    rail ? "justify-center px-1" : "px-2",
  )
}

/**
 * A link on navy: white, DHCW's active blue on hover, yellow when focused, and bold for
 * the current page. Its dot turns dark while the link is yellow (`EntryDot`).
 */
function linkClasses(rail: boolean): string {
  return cn(
    boxClasses(rail),
    "group/entry outline-none hover:bg-sidebar-accent focus-visible:focus-fill aria-[current=page]:font-bold",
  )
}

/** DHCW's yellow on navy, dark on the link's own yellow while it is focused. */
const dotClasses = "bg-focus group-focus-visible/entry:bg-focus-foreground"

/**
 * The dot of an entry with unpublished changes, at the end of the name, and in a rail at
 * the corner of the mark.
 */
function EntryDot({ rail }: { rail: boolean }) {
  return (
    <UnpublishedDot
      className={cn(
        dotClasses,
        rail ? "absolute top-1.5 right-1.5" : "ms-auto",
      )}
    />
  )
}

/**
 * What a screen reader reads, and a tooltip says, for an entry: its name, and for a
 * roadmap with unpublished changes the whole phrase, as its dot shows nothing in words.
 */
function useSpokenName({ name, mark }: NavigationEntryShape): string {
  const { t } = useTranslation()
  return "unpublished" in mark && mark.unpublished
    ? t("roadmaps.navigation.changed", { name })
    : name
}

interface EntryLabelProps extends NavigationEntryShape {
  /** What a screen reader reads where the name is shown in part or with a dot. */
  spoken: string
}

/**
 * What the entry shows: its mark and name; in a rail, its mark alone, a page's name read
 * after its icon and a roadmap's title after the initials that begin its name.
 */
function EntryLabel({ rail, name, mark, spoken }: EntryLabelProps) {
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
  if ("count" in mark) {
    // The count's sentence is the name, which begins with the number shown (WCAG 2.5.3).
    return rail ? (
      <>
        <span
          aria-hidden="true"
          className="inline-grid size-8 place-items-center rounded-full border border-sidebar-border text-body-xs font-bold"
        >
          {mark.count}
        </span>
        <span className="sr-only">{name}</span>
      </>
    ) : (
      <>
        <UnpublishedDot className={dotClasses} />
        <span className="min-w-0 wrap-break-word">{name}</span>
      </>
    )
  }
  const unpublished = mark.unpublished === true
  return (
    <>
      <RoadmapSwatch colour={mark.colour} />
      {rail ? (
        <>
          {/* The initials shown begin its name, so speech input can say them (WCAG 2.5.3). */}
          <span className="text-body-xs font-bold">{mark.initials}</span>{" "}
          <span className="sr-only">{spoken}</span>
        </>
      ) : (
        <>
          <span
            aria-hidden={unpublished || undefined}
            className="min-w-0 wrap-break-word"
          >
            {name}
          </span>
          {unpublished && <span className="sr-only">{spoken}</span>}
        </>
      )}
      {unpublished && <EntryDot rail={rail} />}
    </>
  )
}

interface EntryItemProps extends NavigationEntryShape {
  /** The entry's element around its label: a link, or the text of one. */
  around: (label: ReactNode) => ReactElement
}

/**
 * One destination's list entry: its mark and name in full; in a rail its mark, with its
 * name in a tooltip as it is pointed at or focused.
 */
function EntryItem({ rail, name, mark, around }: EntryItemProps) {
  const spoken = useSpokenName({ rail, name, mark })
  const entry = around(
    <EntryLabel rail={rail} name={name} mark={mark} spoken={spoken} />,
  )
  return (
    <li className={entryClasses}>
      {rail ? (
        <Tooltip>
          <TooltipTrigger render={entry} />
          <TooltipContent side="right">{spoken}</TooltipContent>
        </Tooltip>
      ) : (
        entry
      )}
    </li>
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
  return (
    <EntryItem
      rail={rail}
      name={name}
      mark={mark}
      around={(label) => (
        <a {...anchor} className={linkClasses(rail)}>
          {label}
        </a>
      )}
    />
  )
}

export const NavigationLink = createLink(NavigationEntry)

/**
 * An entry that says something and leads nowhere, drawn as a link is: the count of
 * unpublished changes while there is no roadmap to lead to.
 */
export function NavigationText({ rail, name, mark }: NavigationEntryShape) {
  return (
    <EntryItem
      rail={rail}
      name={name}
      mark={mark}
      around={(label) => <span className={boxClasses(rail)}>{label}</span>}
    />
  )
}
