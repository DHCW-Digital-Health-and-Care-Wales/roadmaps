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
 * it asks to reconnect first, then reads (STY-057).
 */
export function RefreshButton({ fetching, onRefresh }: RefreshButtonProps) {
  const { t } = useTranslation()
  const refresh = useSessionAction(onRefresh)
  return (
    <Button
      variant="secondary"
      disabled={fetching}
      focusableWhenDisabled
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
      {t("roadmaps.refresh")}
    </Button>
  )
}
