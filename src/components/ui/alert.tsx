// Deviates from upstream shadcn (ADR-010): imports cn from @/lib/utils; text-body-xs for
// upstream's text-sm. The look follows DHCW's callouts at the pinned release: `info` and
// `success` are the notification banner (a 4px border in the status ink, not DHCW's 6px
// with a header band), `warning` is the warning callout (DHCW's yellow border on a pale
// yellow body) and `destructive` is the error summary (a 4px red border). The layout is a
// flex row, not upstream's grid: an icon, an `AlertContent` holding the title and
// description, and an `AlertAction` that wraps below on a phone. `AlertTitle` can render as
// a heading (`as`, then at `text-heading-m`), for a notice that is a page's only content. Each variant sets its own
// icon colour, so nothing forces `currentColor` on a feature's icon. `role` defaults to
// `alert` and can be `note` for a notice that must not interrupt (the status badge has
// already announced it).
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  "group/alert relative flex w-full items-start gap-3 border-4 px-4 py-3 text-left text-body-xs max-sm:flex-wrap [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        info: "border-status-info-border bg-card text-card-foreground [&>svg]:text-status-info-fg",
        success:
          "border-status-success-border bg-card text-card-foreground [&>svg]:text-status-success-fg",
        warning:
          "border-focus bg-status-warning-bg text-status-warning-fg [&>svg]:text-status-warning-fg",
        destructive:
          "border-destructive bg-card text-card-foreground **:data-[slot=alert-title]:text-destructive [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  },
)

function Alert({
  className,
  variant,
  role = "alert",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role={role}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-content"
      className={cn("min-w-0 flex-1", className)}
      {...props}
    />
  )
}

function AlertTitle({
  as: Title = "div",
  className,
  ...props
}: React.ComponentProps<"div"> & { as?: "div" | "h1" | "h2" }) {
  return (
    <Title
      data-slot="alert-title"
      className={cn(
        // A heading (a notice that is a page's only content) is DHCW's callout heading.
        Title === "div" ? "text-body-xs font-bold" : "text-heading-m",
        className,
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-body-xs text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_p:not(:last-child)]:mb-4",
        className,
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn(
        "shrink-0 self-center max-sm:w-full max-sm:pl-7",
        className,
      )}
      {...props}
    />
  )
}

export { Alert, AlertContent, AlertTitle, AlertDescription, AlertAction }
