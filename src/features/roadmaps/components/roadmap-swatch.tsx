import { cn } from "@/lib/utils"

/** What the data source may hold in a roadmap's colour, once parsed (ADR-009). */
const HEX_COLOUR = /^#[0-9a-f]{6}$/

export interface RoadmapSwatchProps {
  /** The roadmap's own colour, `#rrggbb`; `null` shows a theme colour instead. */
  colour: string | null
}

/**
 * A roadmap's colour as a decorative strip: never text, never behind text, and never the
 * only thing that says something, so a sheet colour cannot break contrast in either
 * theme (ADR-009). The value is checked here as well, since it is data from the
 * spreadsheet and goes into a style.
 */
export function RoadmapSwatch({ colour }: RoadmapSwatchProps) {
  const own = colour !== null && HEX_COLOUR.test(colour)
  return (
    <span
      aria-hidden="true"
      className={cn(
        "w-1.5 shrink-0 self-stretch rounded-full",
        // Without a colour of its own, the strip is a decorative neutral.
        !own && "bg-border",
      )}
      // eslint-disable-next-line no-restricted-syntax -- ADR-010's data-colour exception: the roadmap's own colour (ADR-009), checked above
      style={own ? { backgroundColor: colour } : undefined}
    />
  )
}
