// @lint-as src/components/ui/fixture.tsx
// Shared components follow every rule but one: a menu item may colour its highlight,
// which Base UI shows through focus. Not app code: never imported or built.
import { cva } from "class-variance-authority"

export const sharedComponent = [
  <div className="focus:bg-accent focus:text-accent-foreground" />,
  <div className="focus-visible:focus-ring" />,
  <div className="focus-visible:ring-3" />, // ✗ Ad-hoc focus style
  <div className="focus:outline-ring" />, // ✗ Ad-hoc focus style
  <div className="focus-visible:focus-fill [&:focus-visible]:bg-muted" />, // ✗ Ad-hoc focus style
  <div className="dark:aria-invalid:border-destructive" />, // ✗ dark: colour override
  <div className="bg-neutral-900" />, // ✗ Unknown class detected: bg-neutral-900
  cva("", { variants: { variant: { link: "text-primary" } } }), // ✗ use text-link
  cva("", { variants: { size: { xs: "rounded-[min(var(--radius-md),10px)]" } } }), // ✗ Arbitrary radius
]
