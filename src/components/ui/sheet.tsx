// Deviates from upstream shadcn (ADR-010): imports cn from @/lib/utils. It is the
// dialog's dimmed page (`bg-overlay`, no backdrop blur) with a panel along the screen's
// left edge, the only side the app uses (STY-054's navigation drawer); upstream's other
// sides, header, footer and description are gone. The panel's colours are its user's:
// the drawer is navy, as the navigation is. Upstream's corner close button carries copy,
// which `components/ui` never does, so its user draws its own `SheetClose`. It slides
// 2.5rem as it fades, animated as the dialog and the menus are and stilled under reduced
// motion by `globals.css`.
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
        className="fixed inset-0 z-50 bg-overlay duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
      />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full w-4/5 max-w-sm flex-col shadow-popup duration-200 outline-none data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-left-10 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-left-10",
          className,
        )}
        {...props}
      />
    </SheetPrimitive.Portal>
  )
}

function SheetTitle(props: SheetPrimitive.Title.Props) {
  return <SheetPrimitive.Title data-slot="sheet-title" {...props} />
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
