// Deviates from upstream shadcn (ADR-010): imports cn from @/lib/utils. It is the
// dialog's dimmed page (`bg-overlay`, no backdrop blur) with a panel along the screen's
// left edge, the only side the app uses (STY-054's navigation drawer); upstream's other
// sides, header, footer and description are gone. The panel's colours are its user's:
// the drawer is navy, as the navigation is. Upstream's corner close button carries copy,
// which `components/ui` never does, so its user draws its own `SheetClose`. It slides
// 2.5rem as it fades, stilled under reduced motion by `globals.css`.
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/lib/utils"

function Sheet<Payload>({ ...props }: SheetPrimitive.Root.Props<Payload>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger<Payload>({
  ...props
}: SheetPrimitive.Trigger.Props<Payload>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetContent({ className, ...props }: SheetPrimitive.Popup.Props) {
  return (
    <SheetPrimitive.Portal data-slot="sheet-portal">
      <SheetPrimitive.Backdrop
        data-slot="sheet-overlay"
        className="fixed inset-0 z-50 bg-overlay transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0"
      />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-4/5 max-w-sm flex-col shadow-popup transition duration-200 ease-in-out outline-none data-ending-style:-translate-x-10 data-ending-style:opacity-0 data-starting-style:-translate-x-10 data-starting-style:opacity-0",
          className,
        )}
        {...props}
      />
    </SheetPrimitive.Portal>
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn(className)}
      {...props}
    />
  )
}

const createSheetHandle = SheetPrimitive.createHandle

export {
  createSheetHandle,
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
}
