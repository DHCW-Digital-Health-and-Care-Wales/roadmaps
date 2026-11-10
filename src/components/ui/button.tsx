// Deviates from upstream shadcn (ADR-010): imports cn from @/lib/utils. The look is
// DHCW's button (src/foundations/_button-base.scss, src/components/actions/_button.scss at
// the pinned release): bold text, 4px corners, a 2px bottom bar (`shadow-control`), and
// half opacity with no bar when disabled, including a button that stays focusable
// (`data-disabled`). Variants: `default` (primary), `secondary` (white, grey border and bar),
// `destructive` (DHCW's solid red warning button), `ghost` and `header` (white on the navy
// header band, with the chips' border and a lighter hover); upstream's `outline`, `link`
// and the xs/lg sizes are gone, so a group is always 40px (`default`) or 32px (`sm`).
// focus-visible:focus-fill for upstream's ring, and no `dark:` overrides, which would beat
// the focus fill in the dark theme. Hovers are --primary-hover, --muted and
// --destructive-hover (the fill is --destructive-fill, as --destructive is the text red);
// aria-invalid shows only the destructive border. Pressed moves the button 1px, as DHCW's;
// DHCW's darker pressed fill is not ported.
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent font-bold whitespace-nowrap transition-all outline-none select-none focus-visible:focus-fill active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none aria-invalid:border-destructive data-disabled:pointer-events-none data-disabled:opacity-50 data-disabled:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground shadow-control hover:bg-primary-hover",
        secondary:
          "border-input bg-background text-foreground shadow-control-edge hover:bg-muted",
        destructive:
          "border-destructive-fill bg-destructive-fill text-destructive-foreground shadow-control hover:border-destructive-hover hover:bg-destructive-hover",
        ghost: "text-foreground hover:bg-muted aria-expanded:bg-muted",
        header:
          "border-header-border text-header-foreground hover:bg-header-hover aria-expanded:bg-header-hover",
      },
      size: {
        default:
          "h-10 gap-2 px-4 text-body has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        sm: "h-8 gap-1.5 px-3 text-body-xs has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3.5",
        icon: "size-10",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
