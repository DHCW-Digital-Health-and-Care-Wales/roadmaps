import { useId, type ReactNode, type RefObject } from "react"

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
  /**
   * A write is under way: the dialog stays until it answers. The form holds its own
   * fields meanwhile, so both are told by the same write.
   */
  busy?: boolean
  /** Cancel or Escape was chosen: the caller closes it, dropping what was typed. */
  onClose: () => void
  /**
   * The control that opens it, where focus goes as it closes. Required: left to itself
   * focus goes back to whatever held it as the dialog opened, which is not that control
   * in a browser that leaves a clicked button unfocused, as Safari does (DEF-008).
   */
  opener: RefObject<HTMLElement | null>
  /**
   * The form, given the heading's id to be named by, and drawn afresh each time the
   * dialog opens. Its Cancel is a `DialogClose`.
   */
  children: (titleId: string) => ReactNode
}

/**
 * A form in a dialog, as EPC-011's _The dialogs_ sets for every one: modal, named by its
 * heading, with focus in its first field as it opens and back on the control that opened
 * it as it closes (its `opener`). Cancel and Escape close it; a
 * click outside does nothing. On a phone it fills the width from the foot of the screen,
 * and it scrolls when it is taller than the screen.
 */
export function FormDialog({
  open,
  title,
  busy = false,
  onClose,
  opener,
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
      <DialogContent finalFocus={opener}>
        <DialogHeader>
          <DialogTitle id={titleId}>{title}</DialogTitle>
        </DialogHeader>
        {children(titleId)}
      </DialogContent>
    </Dialog>
  )
}
