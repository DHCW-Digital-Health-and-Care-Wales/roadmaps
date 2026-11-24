import { LayoutGridIcon, ListIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import type { ItemsView } from "../hooks/use-items-view"

export interface ItemsViewSwitchProps {
  view: ItemsView
  onChoose: (view: ItemsView) => void
  /**
   * One button, "Compact view", pressed while the view is compact, as narrower than a
   * tablet (S2); otherwise the two-part switch (S1).
   */
  single: boolean
}

/**
 * What holds a button of the switch, drawn under it and over it: DHCW's grey, with a
 * dark inner ring, while the button is pressed. The holder carries it, not the button,
 * which is transparent over it: on the button it would sort after the focus fill and
 * hide it (`apps/editor/AGENTS.md`), where over it the ring still shows with the fill.
 */
const holderClasses =
  "relative flex shrink-0 rounded-lg bg-background has-aria-pressed:bg-secondary-hover has-aria-pressed:after:pointer-events-none has-aria-pressed:after:absolute has-aria-pressed:after:inset-0 has-aria-pressed:after:rounded-lg has-aria-pressed:after:inset-ring-2 has-aria-pressed:after:inset-ring-foreground"

/** Each part of the two-part switch: its holder's and its button's squared corners. */
const JOINED_CLASSES = {
  cards: {
    holder: "rounded-r-none has-aria-pressed:after:rounded-r-none",
    button: "rounded-r-none",
  },
  compact: {
    holder: "-ml-px rounded-l-none has-aria-pressed:after:rounded-l-none",
    button: "rounded-l-none",
  },
} as const satisfies Record<ItemsView, { holder: string; button: string }>

/**
 * The switch between a roadmap's two views of its items (STY-067 D5, D13): from a
 * tablet's width a group named "View" of two buttons, Cards and Compact, joined, the
 * view in use pressed; narrower, one button with the rows icon, named "Compact view",
 * pressed while the view is compact. Either keeps focus as it is pressed (S3).
 */
export function ItemsViewSwitch({
  view,
  onChoose,
  single,
}: ItemsViewSwitchProps) {
  const { t } = useTranslation()
  if (single) {
    const compact = view === "compact"
    return (
      <span className={holderClasses}>
        <Button
          variant="secondary"
          size="icon"
          aria-pressed={compact}
          className="bg-transparent"
          onClick={() => {
            onChoose(compact ? "cards" : "compact")
          }}
        >
          <ListIcon aria-hidden="true" />
          <span className="sr-only">{t("roadmaps.view.compactView")}</span>
        </Button>
      </span>
    )
  }
  const choice = (each: ItemsView) => (
    // Joined: the first's right corners square, the second's left, their borders one.
    <span className={cn(holderClasses, JOINED_CLASSES[each].holder)}>
      <Button
        variant="secondary"
        aria-pressed={view === each}
        className={cn("bg-transparent", JOINED_CLASSES[each].button)}
        onClick={() => {
          onChoose(each)
        }}
      >
        {each === "cards" ? (
          <LayoutGridIcon data-icon="inline-start" aria-hidden="true" />
        ) : (
          <ListIcon data-icon="inline-start" aria-hidden="true" />
        )}
        {t(`roadmaps.view.${each}`)}
      </Button>
    </span>
  )
  return (
    <div
      role="group"
      aria-label={t("roadmaps.view.label")}
      className="flex shrink-0"
    >
      {choice("cards")}
      {choice("compact")}
    </div>
  )
}
