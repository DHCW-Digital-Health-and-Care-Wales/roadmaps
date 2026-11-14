// Deviates from upstream shadcn (ADR-010): imports cn from @/lib/utils. The look is the
// alert dialog's, DHCW's timeout dialog (src/components/content/_timeout-modal.scss at
// the pinned release): 24px padding, a grey border, square 4px corners, the popup shadow
// menus use and a dimmed page (`bg-overlay`). It holds a form, so it is wider, at most
// 32rem, and never taller than the screen: its content scrolls. On a phone it fills the
// width from the foot of the screen (EPC-011, _The dialogs_). The header and footer are
// left-aligned, the title is DHCW's `text-heading-m` and the description body text;
// buttons sit inline in their DOM order, wrapping on a phone. Upstream's corner close
// button and footer "Close" (both carry copy, which `components/ui` never does),
// backdrop blur and muted footer band are gone. `DialogClose` is the secondary button.
import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
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

function DialogContent({ className, ...props }: DialogPrimitive.Popup.Props) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[calc(100dvh-2rem)] flex-col gap-4 overflow-y-auto rounded-t-lg border border-border bg-popover p-6 text-popover-foreground shadow-popup duration-100 outline-none sm:inset-x-4 sm:top-1/2 sm:bottom-auto sm:max-w-lg sm:-translate-y-1/2 sm:rounded-lg data-open:animate-in data-open:fade-in-0 sm:data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 sm:data-closed:zoom-out-95",
          className,
        )}
        {...props}
      />
    </DialogPortal>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2 text-left", className)}
      {...props}
    />
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex flex-wrap gap-3", className)}
      {...props}
    />
  )
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("text-heading-m text-pretty", className)}
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
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
