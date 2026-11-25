import { createLink } from "@tanstack/react-router"
import { ListFilterIcon } from "lucide-react"
import type { ComponentProps, ReactElement, ReactNode, Ref } from "react"
import { Trans } from "react-i18next"

import { UnpublishedDot } from "@/components/layout/unpublished-dot"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { ContentLanguage } from "@/domain/roadmap/localised-text"
import { cn } from "@/lib/utils"

import { ShownText } from "../components/content-text"
import { RoadmapSwatch } from "../components/roadmap-swatch"
import type { FoundPart } from "./narrow-roadmaps"

/** What marks a destination beside its name, and alone in a rail. */
type NavigationMark =
  /** A page's icon, shown in both forms. */
  | { icon: ReactNode }
  /**
   * A roadmap's colour as a strip, and in a rail its initials in place of its title; a dot
   * after it while it has unpublished changes (STY-055 D1), which its name then says; in
   * full, the part of its title the navigation's search found, underlined (STY-061 S1).
   */
  | {
      colour: string | null
      initials: string
      unpublished?: boolean
      found?: FoundPart | null
    }
  /**
   * A number in a circle in a rail, and a dot beside the name in full; `narrows` ends it
   * with a filter's icon in full, for the count that narrows the list (STY-063).
   */
  | { count: number; narrows?: boolean }

/** What every entry takes, a link or the text that stands where one cannot lead. */
interface NavigationEntryShape {
  /** Folded to a rail: the mark, the name in a tooltip and, beyond the initials, read only. */
  rail: boolean
  name: string
  /** The shown name's `lang`: set only for a roadmap's English title in Welsh. */
  nameLang?: ContentLanguage | undefined
  mark: NavigationMark
}

// Its classes are the navigation's own, so the anchor takes none from a caller.
interface NavigationEntryProps
  extends
    Omit<ComponentProps<"a">, "children" | "className">,
    NavigationEntryShape {}

/**
 * The entry holding the current page, or a pressed button, is DHCW's active blue. The
 * entry carries it, not the link: on the link it would sort after the focus fill and hide
 * it.
 */
const entryClasses =
  "rounded-lg has-[[aria-current=page]]:bg-sidebar-accent has-[[aria-pressed=true]]:bg-sidebar-accent"

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
 * A roadmap's English title in Welsh stays marked in it.
 */
function spokenName({ name, nameLang, mark }: NavigationEntryShape): ReactNode {
  const shown = <ShownText content={{ text: name, lang: nameLang }} />
  return "unpublished" in mark && mark.unpublished ? (
    <Trans i18nKey="roadmaps.navigation.changed" components={{ name: shown }} />
  ) : (
    shown
  )
}

interface EntryLabelProps extends NavigationEntryShape {
  /** What a screen reader reads where the name is shown in part or with a dot. */
  spoken: ReactNode
}

/**
 * What the entry shows: its mark and name; in a rail, its mark alone, a page's name read
 * after its icon and a roadmap's title after the initials that begin its name.
 */
function EntryLabel({ rail, name, nameLang, mark, spoken }: EntryLabelProps) {
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
        {mark.narrows && (
          <ListFilterIcon
            aria-hidden="true"
            className="ms-auto size-4 shrink-0"
          />
        )}
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
            lang={nameLang}
            aria-hidden={unpublished || undefined}
            className="min-w-0 wrap-break-word"
          >
            <FoundName name={name} found={mark.found ?? null} />
          </span>
          {unpublished && <span className="sr-only">{spoken}</span>}
        </>
      )}
      {unpublished && <EntryDot rail={rail} />}
    </>
  )
}

/** A name with the part a search found underlined, read as the name alone. */
function FoundName({ name, found }: { name: string; found: FoundPart | null }) {
  if (!found) return name
  return (
    <>
      {name.slice(0, found.start)}
      <span className="underline decoration-2 underline-offset-3">
        {name.slice(found.start, found.end)}
      </span>
      {name.slice(found.end)}
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
function EntryItem({ rail, name, nameLang, mark, around }: EntryItemProps) {
  const spoken = spokenName({ rail, name, nameLang, mark })
  const entry = around(
    <EntryLabel
      rail={rail}
      name={name}
      nameLang={nameLang}
      mark={mark}
      spoken={spoken}
    />,
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
  nameLang,
  mark,
  ...anchor
}: NavigationEntryProps) {
  return (
    <EntryItem
      rail={rail}
      name={name}
      nameLang={nameLang}
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
 * unpublished changes while there is no roadmap to lead to, and no button to press.
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

interface NavigationButtonProps extends NavigationEntryShape {
  /**
   * Whether it is pressed, to sight and to a screen reader; none in a rail, where pressing
   * always opens.
   */
  pressed: boolean | undefined
  onPress: () => void
  /** Takes focus as it shows, where the Product Lead pressed its rail form. */
  ref?: Ref<HTMLButtonElement>
}

/**
 * An entry that does something rather than leads somewhere, drawn as a link is, and
 * pressed or not as a toggle: the count of unpublished changes while two or more
 * roadmaps have them, which shows only those roadmaps (STY-063). A plain `<button>` in the
 * links' classes, not `Button variant="navigation"`, whose bold type and press shift would
 * set it apart from the entries around it.
 */
export function NavigationButton({
  rail,
  name,
  mark,
  pressed,
  onPress,
  ref,
}: NavigationButtonProps) {
  return (
    <EntryItem
      rail={rail}
      name={name}
      mark={mark}
      around={(label) => (
        <button
          ref={ref}
          type="button"
          aria-pressed={pressed}
          onClick={onPress}
          className={cn(linkClasses(rail), "w-full text-start")}
        >
          {label}
        </button>
      )}
    />
  )
}
