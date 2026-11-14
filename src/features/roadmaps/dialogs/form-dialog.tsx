import { useId, type ReactNode } from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export interface FormDialogProps {
  open: boolean
  /** The heading, which names the dialog. */
  title: string
  /** A write is under way: the dialog stays until it answers. */
  busy?: boolean
  /** Cancel or Escape was chosen: the caller closes it, dropping what was typed. */
  onClose: () => void
  /**
   * The form, given the heading's id to be named by, and drawn afresh each time the
   * dialog opens. Its Cancel is a `DialogClose`.
   */
  children: (titleId: string) => ReactNode
}

/**
 * A form in a dialog, as EPC-011's _The dialogs_ sets for every one: modal, named by its
 * heading, with focus in its first field as it opens and back on the control that opened
 * it as it closes. Cancel and Escape close it; a click outside does nothing. On a phone
 * it fills the width from the foot of the screen, and it scrolls when it is taller than
 * the screen.
 */
export function FormDialog({
  open,
  title,
  busy = false,
  onClose,
  children,
}: FormDialogProps) {
  const titleId = useId()
  return (
    <Dialog
      open={open}
      disablePointerDismissal
      onOpenChange={(next) => {
        if (!next && !busy) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle id={titleId}>{title}</DialogTitle>
        </DialogHeader>
        {children(titleId)}
      </DialogContent>
    </Dialog>
  )
}
