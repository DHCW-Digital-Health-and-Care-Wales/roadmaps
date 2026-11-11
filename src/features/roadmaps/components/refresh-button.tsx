import { RefreshCwIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/use-auth"
import { cn } from "@/lib/utils"

export interface RefreshButtonProps {
  /** A read is in flight: the button is busy and spins. */
  fetching: boolean
  onRefresh: () => void
}

/** Reads a page's roadmap data again; unavailable, but focusable, unless connected. */
export function RefreshButton({ fetching, onRefresh }: RefreshButtonProps) {
  const { t } = useTranslation()
  const connected = useAuth().state.status === "connected"
  return (
    <Button
      variant="secondary"
      disabled={!connected || fetching}
      focusableWhenDisabled
      aria-busy={fetching}
      onClick={onRefresh}
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
