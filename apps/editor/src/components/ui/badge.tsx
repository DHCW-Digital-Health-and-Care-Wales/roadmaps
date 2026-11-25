// Deviates from upstream shadcn (ADR-010): this is DHCW's tag (src/components/content/
// _tag.scss at the pinned release), not a rounded badge: square, 14px bold, a 1px border in
// its ink colour, and wrapping text, as a status label is free text. Variants are DHCW's
// tag palette as status tokens (neutral, info, success, warning, danger) and `outline`
// (DHCW's white tag). A tag is a label: it has no hover or focus styles and never looks
// clickable. Imports cn from @/lib/utils. Only `Badge` is exported: nothing else uses
// `badgeVariants` (knip).
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex w-fit max-w-full shrink-0 items-center justify-center gap-1 border px-2 py-0.5 text-center text-body-xs font-bold wrap-anywhere [&>svg]:pointer-events-none [&>svg]:size-3.5 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        neutral:
          "border-status-neutral-border bg-status-neutral-bg text-status-neutral-fg",
        info: "border-status-info-border bg-status-info-bg text-status-info-fg",
        success:
          "border-status-success-border bg-status-success-bg text-status-success-fg",
        warning:
          "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
        danger:
          "border-status-danger-border bg-status-danger-bg text-status-danger-fg",
        outline: "border-foreground bg-background text-foreground",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
)

function Badge({
  className,
  variant = "neutral",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge }
