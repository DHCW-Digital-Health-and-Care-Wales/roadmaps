import type { ReactNode } from "react"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"

export interface StatusPanelProps {
  /** Optional: the compact form passes none. */
  icon?: ReactNode
  title: string
  /** The title's heading level: `h1` when the panel is the whole page. */
  titleAs?: "h1" | "h2" | undefined
  description: string
  /** Buttons or links, e.g. Retry. */
  action?: ReactNode
  /**
   * A short panel with a dashed outline, for an absence among a page's other content
   * (STY-042 S2), rather than a filled one that stands in for the page.
   */
  compact?: boolean
}

/** A calm, centred message in place of content: empty, not found or locked. */
export function StatusPanel({
  icon,
  title,
  titleAs: Title = "h2",
  description,
  action,
  compact = false,
}: StatusPanelProps) {
  return (
    <Empty
      className={cn(
        "border",
        !compact && "min-h-72 border-solid bg-card py-12",
      )}
    >
      <EmptyHeader>
        {Boolean(icon) && (
          <EmptyMedia
            aria-hidden="true"
            className="size-12 rounded-lg border bg-muted text-muted-foreground [&_svg]:size-5"
          >
            {icon}
          </EmptyMedia>
        )}
        <Title className="text-heading-m">{title}</Title>
        <EmptyDescription className="text-pretty">
          {description}
        </EmptyDescription>
      </EmptyHeader>
      {Boolean(action) && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  )
}
