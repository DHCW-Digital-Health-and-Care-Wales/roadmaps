import { SearchIcon, XIcon } from "lucide-react"
import { useRef } from "react"
import { useTranslation } from "react-i18next"

import type { NavigationForm } from "@/components/layout/app-shell"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { useNavigationSearch } from "./navigation-search-context"

export interface NavigationSearchBoxProps {
  form: NavigationForm
  /** Opens the navigation from its rail, remembered as open (S9). */
  onOpenNavigation: () => void
}

/**
 * The navigation's search, at the start of its top row (STY-061): a box that narrows the
 * roadmaps as the Product Lead types, and folded to a rail a spyglass that opens the
 * navigation with focus in it (S9, D4). Nothing until the roadmaps are read (S11, D6).
 */
export function NavigationSearchBox({
  form,
  onOpenNavigation,
}: NavigationSearchBoxProps) {
  const { t } = useTranslation()
  const search = useNavigationSearch()
  const input = useRef<HTMLInputElement>(null)
  if (search.groups === null) return null

  if (form === "rail") {
    return (
      <Button
        variant="header"
        size="icon"
        className="w-full"
        onClick={() => {
          search.requestFocus()
          onOpenNavigation()
        }}
      >
        <SearchIcon aria-hidden="true" />
        <span className="sr-only">{t("roadmaps.navigation.search.label")}</span>
      </Button>
    )
  }

  const clear = () => {
    search.clear()
    input.current?.focus()
  }
  return (
    <div className="relative min-w-0 flex-1">
      <SearchIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-2.5 left-2.5 size-5 text-muted-foreground"
      />
      <Input
        ref={(element) => {
          input.current = element
          if (element && search.takeFocusRequest()) element.focus()
        }}
        type="search"
        autoComplete="off"
        spellCheck={false}
        aria-label={t("roadmaps.navigation.search.label")}
        placeholder={t("roadmaps.navigation.search.placeholder")}
        value={search.query}
        onChange={(event) => {
          search.type(event.currentTarget.value)
        }}
        onKeyDown={(event) => {
          // With text, Escape empties the search; in an empty one it goes on, closing the
          // drawer (S10).
          if (event.key !== "Escape" || search.query === "") return
          event.preventDefault()
          event.stopPropagation()
          clear()
        }}
        // As tall as the buttons beside it, its icon and clear button centred in it.
        className="h-10 px-9 py-0 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {search.query !== "" && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute top-1 right-1"
          onClick={clear}
        >
          <XIcon aria-hidden="true" />
          <span className="sr-only">
            {t("roadmaps.navigation.search.clear")}
          </span>
        </Button>
      )}
    </div>
  )
}
