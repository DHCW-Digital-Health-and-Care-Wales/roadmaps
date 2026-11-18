import { UploadIcon } from "lucide-react"
import type { RefObject } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

import type { PublishAction } from "./pending-changes-store"

/** On a phone, the buttons' padding trimmed to give the count room (STY-060 D5). */
const phonePaddingClasses = "max-sm:px-3"

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
 * act on, "Publish changes" and "Discard all changes" (D11, D18). One row at every
 * width (STY-060 S6, D3): on a phone the count wraps where it must, and Publish drops its
 * icon and both buttons some padding, to give it room (D5).
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
    <div className="flex items-center justify-between gap-3">
      <p className="min-w-0 font-bold" role="status">
        {t(`roadmaps.publish.pending.${action}`, { count })}
      </p>
      <div className="flex shrink-0 gap-3">
        <Button
          ref={publishButton}
          disabled={publishHeld}
          focusableWhenDisabled
          aria-busy={publishing}
          aria-label={t(`roadmaps.publish.action.${action}`)}
          className={phonePaddingClasses}
          onClick={(event) => {
            onPublish(event.currentTarget)
          }}
        >
          <UploadIcon
            data-icon="inline-start"
            aria-hidden="true"
            className="max-sm:hidden"
          />
          {t(`roadmaps.publish.bar.${action}`)}
        </Button>
        <Button
          variant="secondary"
          disabled={discardHeld}
          focusableWhenDisabled
          aria-label={t("roadmaps.publish.discardAll")}
          className={phonePaddingClasses}
          onClick={onDiscard}
        >
          {t("roadmaps.publish.bar.discard")}
        </Button>
      </div>
    </div>
  )
}
