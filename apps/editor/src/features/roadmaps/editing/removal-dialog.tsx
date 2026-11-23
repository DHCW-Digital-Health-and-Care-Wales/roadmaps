import { Trans, useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { LocalisedText } from "@/domain/roadmap/localised-text"

import { ContentText } from "../components/content-text"

import type { PublishAction } from "./pending-changes-store"

export interface RemovalDialogProps {
  open: boolean
  /** The item's title, which its card shows in the interface's language. */
  title: LocalisedText
  /** Whether the roadmap's changes are published or saved (S9). */
  action: PublishAction
  /** Whether the item is new, so Remove drops it at once (S10). */
  isNew: boolean
  /** Whether "Move to Not doing" is offered: not for an item in it or unplaced (S11). */
  offersNotDoing: boolean
  onMoveToNotDoing: () => void
  onRemove: () => void
  /** Cancel, the close button or Escape was chosen. */
  onClose: () => void
  /** Called once it has finished closing, whatever closed it. */
  onClosed: () => void
}

/**
 * The question Remove asks first (STY-049 S1): when the item leaves the roadmap, with
 * "Move to Not doing" first, which shows readers the work was dropped (D3), then
 * Remove, then Cancel. It only keeps a pending change, so it works while the session
 * has expired. Cancel, the close button and Escape close it; a click outside does
 * nothing (EPC-011, _The dialogs_). It moves no focus as it closes: where focus goes
 * depends on what was chosen, which the page sees to (`onClosed`).
 */
export function RemovalDialog({
  open,
  title,
  action,
  isNew,
  offersNotDoing,
  onMoveToNotDoing,
  onRemove,
  onClose,
  onClosed,
}: RemovalDialogProps) {
  const { t } = useTranslation()
  const description = [
    t(`roadmaps.edit.removal.when.${isNew ? "new" : action}`),
    ...(offersNotDoing ? [t(`roadmaps.edit.removal.notDoing.${action}`)] : []),
  ]
  return (
    <Dialog
      open={open}
      disablePointerDismissal
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      onOpenChangeComplete={(next) => {
        if (!next) onClosed()
      }}
    >
      <DialogContent finalFocus={false} closeLabel={t("common.close")}>
        <DialogHeader>
          <DialogTitle>
            <Trans
              i18nKey="roadmaps.edit.removal.title"
              components={{ title: <ContentText value={title} /> }}
            />
          </DialogTitle>
          <DialogDescription>{description.join(" ")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {offersNotDoing && (
            <Button onClick={onMoveToNotDoing}>
              {t("roadmaps.edit.removal.moveToNotDoing")}
            </Button>
          )}
          <Button variant="destructive" onClick={onRemove}>
            {t("roadmaps.edit.removal.confirm")}
          </Button>
          <DialogClose>{t("common.cancel")}</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
