import { UploadIcon } from "lucide-react"
import type { RefObject } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

import type { PublishAction } from "./pending-changes-store"

export interface PendingBarProps {
  action: PublishAction
  /** How many changes are pending. */
  count: number
  publishButton: RefObject<HTMLButtonElement | null>
  /** Publish is unavailable, though focusable. */
  publishHeld: boolean
  /** A publish is under way. */
  publishing: boolean
  /** Discard is unavailable, though focusable. */
  discardHeld: boolean
  /** Called with the button pressed, where focus returns. */
  onPublish: (from: HTMLButtonElement) => void
  onDiscard: () => void
}

/**
 * A roadmap's pending changes at the foot of the screen (STY-052 S2): their count, then
 * Publish (or Save, STY-025 S11) and Discard, short labels whose names say what they
 * act on, "Publish changes" and "Discard all changes" (D11, D18). The count keeps a row
 * of its own on a phone.
 */
export function PendingBar({
  action,
  count,
  publishButton,
  publishHeld,
  publishing,
  discardHeld,
  onPublish,
  onDiscard,
}: PendingBarProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-bold" role="status">
        {t(`roadmaps.publish.pending.${action}`, { count })}
      </p>
      <div className="flex flex-wrap gap-3">
        <Button
          ref={publishButton}
          disabled={publishHeld}
          focusableWhenDisabled
          aria-busy={publishing}
          aria-label={t(`roadmaps.publish.action.${action}`)}
          onClick={(event) => {
            onPublish(event.currentTarget)
          }}
        >
          <UploadIcon data-icon="inline-start" aria-hidden="true" />
          {t(`roadmaps.publish.bar.${action}`)}
        </Button>
        <Button
          variant="secondary"
          disabled={discardHeld}
          focusableWhenDisabled
          aria-label={t("roadmaps.publish.discardAll")}
          onClick={onDiscard}
        >
          {t("roadmaps.publish.bar.discard")}
        </Button>
      </div>
    </div>
  )
}
