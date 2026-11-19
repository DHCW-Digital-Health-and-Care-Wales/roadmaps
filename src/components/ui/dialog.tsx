// Deviates from upstream shadcn (ADR-010): imports cn from @/lib/utils. The look is the
// alert dialog's, DHCW's timeout dialog (src/components/content/_timeout-modal.scss at
// the pinned release): 24px padding, a grey border, square 4px corners, the popup shadow
// menus use and a dimmed page (`bg-overlay`). It holds a form, so it is wider, at most
// 32rem, and never taller than the screen. On a phone it fills the width from the foot of
// the screen (EPC-011, _The dialogs_). The header and footer are left-aligned, the title
// is DHCW's `text-heading-m` and the description body text; buttons sit inline in their
// DOM order, wrapping on a phone. Upstream's corner close button is kept, with one
// departure: its hidden "Close" is the caller's `closeLabel`, since `components/ui`
// carries no copy. The title keeps clear of it (`pe-10`). Upstream's footer "Close",
// backdrop blur and muted footer band are gone. `DialogClose` is the secondary button.
//
// A dialog is a header, a body and a footer (EPC-019). On a screen with room for it (the
// `pinned` variant in globals.css) the header and footer stay put, each set apart by a
// hairline, and only the body scrolls, so the title, the close button and the buttons
// stay in view. Narrower or shorter, the whole popup scrolls as one piece, as it did
// before, and the padding stays the popup's. A header over two fifths of the screen (a very
// long title) scrolls itself, so the footer stays in view. A dialog with no body (a question: its
// description is in the header) has one hairline between its header and its footer.
import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  className,
  variant = "secondary",
  size = "default",
  ...props
}: DialogPrimitive.Close.Props &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
  return (
    <DialogPrimitive.Close
      data-slot="dialog-close"
      className={cn(className)}
      render={<Button variant={variant} size={size} />}
      {...props}
    />
  )
}

function DialogOverlay({
  className,
  ...props
}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-overlay duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className,
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  closeLabel,
  closeDisabled = false,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  /** The corner close button's name, for a screen reader: it shows an icon only. */
  closeLabel: string
  /** A write is under way: the button waits, as the form's Cancel does. */
  closeDisabled?: boolean
  /** Upstream's switch. Off, `DialogTitle` still keeps its `pe-10` clear of the corner. */
  showCloseButton?: boolean
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[calc(100dvh-2rem)] flex-col gap-4 overflow-y-auto rounded-t-lg border border-border bg-popover p-6 text-popover-foreground shadow-popup duration-100 outline-none sm:inset-x-4 sm:top-1/2 sm:bottom-auto sm:max-w-lg sm:-translate-y-1/2 sm:rounded-lg data-open:animate-in data-open:fade-in-0 sm:data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 sm:data-closed:zoom-out-95 pinned:gap-0 pinned:overflow-hidden pinned:p-0",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close-button"
            disabled={closeDisabled}
            // Its 32px square ends 16px from the edge, so its icon ends where the form's
            // content does (the popup's `p-6`); `top-5.5` centres it on the title's row,
            // and `DialogTitle`'s `pe-10` leaves it room. It sits on the popup, not in the
            // header, so it scrolls with the popup on a phone and stays put once pinned.
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute top-5.5 right-4"
              />
            }
          >
            <XIcon aria-hidden="true" />
            {/* The label continues no visible name: it is the whole of the button's. */}
            <span className="sr-only">{closeLabel}</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "flex flex-col gap-2 text-left pinned:max-h-[40dvh] pinned:shrink-0 pinned:overflow-y-auto pinned:border-b pinned:border-border pinned:px-6 pinned:pt-6 pinned:pb-4 pinned:has-[+[data-slot=dialog-footer]]:border-b-0",
        className,
      )}
      {...props}
    />
  )
}

/** What a dialog is for: the part that scrolls once the header and footer are pinned. */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn(
        "flex flex-col gap-4 pinned:min-h-0 pinned:overflow-y-auto pinned:px-6 pinned:py-4",
        className,
      )}
      {...props}
    />
  )
}

/**
 * A dialog's form, which holds its body and its footer so Done and Cancel submit it: it
 * is the column the footer is pinned in. Its header is outside it, in `DialogContent`.
 */
function DialogForm({ className, ...props }: React.ComponentProps<"form">) {
  return (
    <form
      data-slot="dialog-form"
      className={cn(
        "flex flex-col gap-4 pinned:min-h-0 pinned:gap-0",
        className,
      )}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-wrap gap-3 pinned:shrink-0 pinned:border-t pinned:border-border pinned:px-6 pinned:pt-4 pinned:pb-6",
        className,
      )}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("pe-10 text-heading-m text-pretty", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-body text-pretty *:[a]:underline *:[a]:underline-offset-3",
        className,
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogForm,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
