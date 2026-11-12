import { useTranslation } from "react-i18next"

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

export interface DiscardDialogProps {
  open: boolean
  onDiscard: () => void
  onCancel: () => void
}

/** Asks before discarding every pending change to the roadmap (S6). */
export function DiscardDialog({
  open,
  onDiscard,
  onCancel,
}: DiscardDialogProps) {
  const { t } = useTranslation()
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t("roadmaps.publish.discard.title")}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t("roadmaps.publish.discard.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="destructive" onClick={onDiscard}>
            {t("roadmaps.publish.discard.confirm")}
          </Button>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
