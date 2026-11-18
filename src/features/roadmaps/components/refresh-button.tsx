import { RefreshCwIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { useSessionAction } from "@/features/auth/session-action"
import { cn } from "@/lib/utils"

export interface RefreshButtonProps {
  /** A read is in flight: the button is busy and spins. */
  fetching: boolean
  onRefresh: () => void
}

/**
 * Reads a page's roadmap data again; busy while it reads. After the session has expired
 * it asks to reconnect first, then reads (STY-057). On a phone, below 640px, it is a
 * square icon button, still named "Refresh" (STY-058).
 */
export function RefreshButton({ fetching, onRefresh }: RefreshButtonProps) {
  const { t } = useTranslation()
  const refresh = useSessionAction(onRefresh)
  return (
    <Button
      variant="secondary"
      disabled={fetching}
      focusableWhenDisabled
      // The last class beats the size's padding for an icon at the start.
      className="max-sm:w-10 max-sm:gap-0 max-sm:px-0 max-sm:has-data-[icon=inline-start]:px-0"
      aria-busy={fetching}
      onClick={(event) => {
        refresh(event.currentTarget)
      }}
    >
      <RefreshCwIcon
        data-icon="inline-start"
        aria-hidden="true"
        className={cn(fetching && "animate-spin")}
      />
      <span className="max-sm:sr-only">{t("roadmaps.refresh")}</span>
    </Button>
  )
}
