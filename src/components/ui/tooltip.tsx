// Deviates from upstream shadcn (ADR-010): imports cn from @/lib/utils, and draws with
// the theme's tokens: body-xs text in the page's own colours reversed, 4px corners, the
// popup shadow, no arrow (its upstream radius and offsets are values the locked theme
// rejects) and no zoom, only the fade, stilled under reduced motion by `globals.css`.
// A tooltip repeats a name the trigger already has (Base UI does not announce it), so
// it is for sight only: never the only place a name is.
import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

import { cn } from "@/lib/utils"

function TooltipProvider({
  delay = 0,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      {...props}
    />
  )
}

function Tooltip<Payload>({ ...props }: TooltipPrimitive.Root.Props<Payload>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger<Payload>({
  ...props
}: TooltipPrimitive.Trigger.Props<Payload>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  side = "top",
  sideOffset = 4,
  align = "center",
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<TooltipPrimitive.Positioner.Props, "align" | "side" | "sideOffset">) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "w-fit max-w-xs rounded-lg bg-foreground px-3 py-1.5 text-body-xs text-background shadow-popup transition-opacity duration-100 data-ending-style:opacity-0 data-starting-style:opacity-0",
            className,
          )}
          {...props}
        />
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
