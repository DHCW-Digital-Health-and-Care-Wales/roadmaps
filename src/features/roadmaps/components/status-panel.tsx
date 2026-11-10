import type { ReactNode } from "react"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty"

export interface StatusPanelProps {
  icon: ReactNode
  title: string
  /** The title's heading level: `h1` when the panel is the whole page. */
  titleAs?: "h1" | "h2" | undefined
  description: string
  /** Buttons or links, e.g. Retry. */
  action?: ReactNode
  /** `alert` announces a failure as it appears. */
  role?: "alert"
}

/** A calm, centred message in place of content: empty, failed, not found or locked. */
export function StatusPanel({
  icon,
  title,
  titleAs: Title = "h2",
  description,
  action,
  role,
}: StatusPanelProps) {
  return (
    <Empty role={role} className="min-h-72 border bg-card/40 py-12">
      <EmptyHeader>
        <EmptyMedia
          aria-hidden="true"
          className="size-12 rounded-xl border bg-muted/50 text-muted-foreground [&_svg]:size-5"
        >
          {icon}
        </EmptyMedia>
        <Title className="text-heading-m">{title}</Title>
        <EmptyDescription className="text-pretty">
          {description}
        </EmptyDescription>
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  )
}
