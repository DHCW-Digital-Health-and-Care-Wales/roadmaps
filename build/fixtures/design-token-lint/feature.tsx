// @lint-as src/features/fixture/fixture.tsx
// Each line ending `// ✗ <text>` must be reported with a message containing <text>;
// every other line must lint clean, so keep each case on one line. Not app code: never
// imported or built.
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva("")
const active = true
const base = {}
const ROWS = "auto-rows-fr"
const ITEM_CLASSES = "rounded-lg"
const rowClasses = "auto-rows-fr"
const className: string | undefined = undefined

export const s1UnknownClasses = [
  <div className="bg-red-500" />, // ✗ Unknown class detected: bg-red-500
  <div className="text-sm" />, // ✗ Unknown class detected: text-sm
  <div className="shadow-md" />, // ✗ Unknown class detected: shadow-md
  <div className="bg-black/10" />, // ✗ Unknown class detected: bg-black/10
  <div className="tracking-tight" />, // ✗ Unknown class detected: tracking-tight
  <div className="font-mono" />, // ✗ Unknown class detected: font-mono
  <div className="rounded-xs" />, // ✗ Unknown class detected: rounded-xs
  <div className="text-white" />, // ✗ Unknown class detected: text-white
  <div className="hover:bg-emerald-500" />, // ✗ Unknown class detected: hover:bg-emerald-500
  <div className={cn("p-2", "bg-amber-500")} />, // ✗ Unknown class detected: bg-amber-500
  <div className={cn({ "border-slate-200": true })} />, // ✗ Unknown class detected: border-slate-200
  cva("bg-sky-500"), // ✗ Unknown class detected: bg-sky-500
  cva("", { variants: { tone: { warm: "text-orange-700" } } }), // ✗ Unknown class detected: text-orange-700
  buttonVariants({ variant: "secondary", className: "bg-red-500" }), // ✗ Unknown class detected: bg-red-500
  buttonVariants({ class: "bg-red-600" }), // ✗ Unknown class detected: bg-red-600
  <a className={cn(buttonVariants({ className: "bg-stone-50" }))} />, // ✗ Unknown class detected: bg-stone-50
  buttonVariants({ variant: "ghost", size: "sm", className: "-ml-2.5 text-muted-foreground" }),
]

export const stateClasses = {
  idle: "bg-zinc-400", // ✗ Unknown class detected: bg-zinc-400
  busy: "bg-status-warning-fg",
}

export const s1SemanticUtilities = [
  <div className="bg-primary text-primary-foreground" />,
  <div className="text-body text-status-warning-fg shadow-control" />,
  <div className="font-heading text-heading-xl font-medium" />,
  <div className="rounded-full rounded-md border-input bg-transparent" />,
  <div className="shadow-popup ring-1 ring-border" />,
]

export const s1PrimaryAsText = [
  <div className="text-primary" />, // ✗ text-primary uses the primary fill as text
  <div className="hover:text-primary" />, // ✗ use text-link
  <div className="[&>a:hover]:text-primary" />, // ✗ use text-link
  <div className="decoration-primary" />, // ✗ use decoration-link
  <div className="hover:text-primary-hover" />, // ✗ use text-link
  <a className={cn(buttonVariants({ className: "text-primary" }))} />, // ✗ use text-link
  <div className="text-primary-foreground" />,
]

export const s2ArbitraryValues = [
  <div className="text-[#fff]" />, // ✗ Arbitrary text value
  <div className="text-[13px]" />, // ✗ Arbitrary text value
  <div className="text-(length:--x)" />, // ✗ Arbitrary text value
  <div className="text-(color:--x)" />, // ✗ Arbitrary text value
  <div className="bg-[oklch(0.5_0.1_250)]" />, // ✗ Arbitrary bg value
  <div className="bg-(--x)" />, // ✗ Arbitrary bg value
  <div className="border-[color-mix(in_oklch,red,blue)]" />, // ✗ Arbitrary border value
  <div className="ring-[#000]" />, // ✗ Arbitrary ring value
  <div className="hover:fill-[red]" />, // ✗ Arbitrary fill value
  <div className="[color:red]" />, // ✗ Arbitrary color
  <div className="[background-color:red]" />, // ✗ Arbitrary background-color
  <div className="[font-size:13px]" />, // ✗ Arbitrary font-size
  <div className="[--primary:red]" />, // ✗ Custom properties are set in globals.css
  <div className="leading-[1.1]" />, // ✗ leading-* sets type by hand
  <div className="leading-6" />, // ✗ leading-* sets type by hand
  <div className="tracking-[0.1em]" />, // ✗ tracking-* sets type by hand
  <div className="rounded-[10px]" />, // ✗ Arbitrary radius
  <div className="rounded-tl-(--x)" />, // ✗ Arbitrary radius
  <div className="shadow-[0_1px_2px_black]" />, // ✗ Arbitrary shadow value
  <div className="drop-shadow-(--x)" />, // ✗ Arbitrary drop-shadow value
  <div className="font-[Comic_Sans_MS]" />, // ✗ Arbitrary font
  <div className="bg-linear-[to_right,red_1px,transparent_1px]" />, // ✗ Arbitrary gradient
  <div className="bg-radial-[at_50%_0%,color-mix(in_oklch,red,transparent)]" />, // ✗ Arbitrary gradient
  <div className="bg-conic-(--x)" />, // ✗ Arbitrary gradient
  <div className="bg-linear-to-r from-muted to-card" />,
  <div className={cn("text-[13px]")} />, // ✗ Arbitrary text value
  <div className="max-h-(--available-height) w-[37rem] min-w-[96px] grid-cols-[auto_1fr]" />,
  <div className="bg-size-[56px_56px] transition-[border-color,box-shadow]" />,
]

export const s3DarkAndFocus = [
  <div className="dark:bg-muted" />, // ✗ dark: colour override
  <div className="dark:hover:border-border" />, // ✗ dark: colour override
  <div className="[.dark_&]:bg-muted" />, // ✗ Theme selector in a class
  <button className="focus-visible:ring-2" />, // ✗ Only a focus utility styles focus here
  <button className="focus:outline-primary" />, // ✗ Only a focus utility styles focus here
  <button className="focus-visible:bg-muted" />, // ✗ Only a focus utility styles focus here
  <button className="has-focus-visible:border-input" />, // ✗ Only a focus utility styles focus here
  <div className="group-focus-visible:ring-1" />, // ✗ Ad-hoc focus style
  <button className="focus-visible:focus-fill [&:focus-visible]:bg-muted" />, // ✗ Ad-hoc focus style
  <button className="[&:focus]:ring-2" />, // ✗ Ad-hoc focus style
  <div className="[&:has(:focus-visible)]:outline-ring" />, // ✗ Ad-hoc focus style
  <div className="group-[:focus]:text-link" />, // ✗ Ad-hoc focus style
  <button className={cn(buttonVariants({ className: "focus-visible:ring-2" }))} />, // ✗ Only a focus utility styles focus here
  <button className="focus-visible:focus-fill" />,
  <div className="has-focus-visible:focus-ring" />,
  <a className="focus-visible:focus-link" />,
  <a className="sr-only focus:not-sr-only focus:fixed focus:top-2.5 focus:focus-fill focus:px-3" />,
  <div className="group-has-focus-visible:text-foreground dark:hidden" />,
]

export const s4BackDoors = [
  <span style={{ color: "red" }} />, // ✗ Design property in an inline style
  <span style={{ backgroundColor: "#fff" }} />, // ✗ Design property in an inline style
  <span style={{ borderTopColor: "red" }} />, // ✗ Design property in an inline style
  <span style={{ outlineColor: "red" }} />, // ✗ Design property in an inline style
  <span style={{ fill: "red" }} />, // ✗ Design property in an inline style
  <span style={{ stroke: "red" }} />, // ✗ Design property in an inline style
  <span style={{ caretColor: "red" }} />, // ✗ Design property in an inline style
  <span style={{ fontSize: 13 }} />, // ✗ Design property in an inline style
  <span style={{ fontFamily: "serif" }} />, // ✗ Design property in an inline style
  <span style={{ lineHeight: 1.2 }} />, // ✗ Design property in an inline style
  <span style={{ letterSpacing: "1px" }} />, // ✗ Design property in an inline style
  <span style={{ borderRadius: 4 }} />, // ✗ Design property in an inline style
  <span style={{ borderBottomLeftRadius: 4 }} />, // ✗ Design property in an inline style
  <span style={{ boxShadow: "none" }} />, // ✗ Design property in an inline style
  <span style={{ textShadow: "none" }} />, // ✗ Design property in an inline style
  <span style={{ "background-color": "red" }} />, // ✗ Design property in an inline style
  <span style={{ "--x": "red" } as React.CSSProperties} />, // ✗ may only map onto a semantic token
  <span style={{ "--normal-bg": "var(--popover)" } as React.CSSProperties} />,
  <span style={{ position: "absolute", width: 10, transform: "none", gridColumn: 2 }} />,
  <span style={active ? { width: 10 } : undefined} />,
  <span style={base} />, // ✗ Write an inline style as an object literal
  <span style={{ ...base, width: 10 }} />, // ✗ without spreads
  <span style={active ? base : undefined} />, // ✗ Write an inline style as an object literal
  <span style={active ? ({ "--x": "var(--y)" } as React.CSSProperties) : undefined} />,
  <span style={base as React.CSSProperties} />, // ✗ Write an inline style as an object literal
  <svg fill="#fff" />, // ✗ Literal colour in an SVG attribute
  <path stroke="red" />, // ✗ Literal colour in an SVG attribute
  <stop stopColor={"#000"} />, // ✗ Literal colour in an SVG attribute
  <svg color={`#fff`} />, // ✗ Literal colour in an SVG attribute
  <svg fill={active ? "red" : "none"} />, // ✗ Literal colour in an SVG attribute
  <svg fill={active ? "currentColor" : "none"} stroke={`url(#${String(active)})`} />,
  <svg fill={String(active) === "selected" ? "currentColor" : "none"} />,
  <svg stroke={active && "#000"} />, // ✗ Literal colour in an SVG attribute
  <svg fill={active ? "none" : active ? "none" : "red"} />, // ✗ Literal colour in an SVG attribute
  <svg fill={`#${"fff"}`} />, // ✗ Literal colour in an SVG attribute
  <span style={{ fontVariantNumeric: "tabular-nums", scrollbarColor: "red" }} />, // ✗ Design property in an inline style
  <span style={{ fontVariantEmoji: "emoji" }} />, // ✗ Design property in an inline style
  <span style={{ "font-synthesis-weight": "none" }} />, // ✗ Design property in an inline style
  <div className="[font-variant-emoji:emoji]" />, // ✗ Arbitrary font-variant-emoji
  <svg fill="none" stroke="currentColor" />,
  <div className="bg-(--nhsw-link-colour)" />, // ✗ primitive outside globals.css
  <span style={{ "--x": "var(--app-dark-link)" } as React.CSSProperties} />, // ✗ primitive outside globals.css
]

export const s4ClassVariables = [
  <div className={ROWS} />, // ✗ Class list in a variable lint cannot see
  <div className={ITEM_CLASSES} />, // ✗ Class list in a variable lint cannot see
  <div className={cn("p-2", ROWS)} />, // ✗ Class list in a variable lint cannot see
  <div className={cn("p-2", active && ROWS)} />, // ✗ Class list in a variable lint cannot see
  <div className={cn(active ? "p-2" : ROWS)} />, // ✗ Class list in a variable lint cannot see
  <div className={active ? ROWS : undefined} />, // ✗ Class list in a variable lint cannot see
  <div className={rowClasses} />,
  <div className={cn("p-2", active && rowClasses, className)} />,
  <div className={active ? rowClasses : undefined} />,
  <div className={cn(active ? "p-2" : "p-3", stateClasses.idle)} />,
]

const layoutStyle: React.CSSProperties = { color: "red" } // ✗ Design property in an inline style
export { layoutStyle }

export const s8OpacityModifiers = [
  <div className="bg-foreground/20" />, // ✗ Opacity modifier on a colour
  <div className="text-muted-foreground/60" />, // ✗ Opacity modifier on a colour
  <div className="ring-ring/50" />, // ✗ Opacity modifier on a colour
  <div className="border-foreground/10" />, // ✗ Opacity modifier on a colour
  <div className="bg-primary/[0.2]" />, // ✗ Opacity modifier on a colour
  <div className="bg-primary/(--x)" />, // ✗ Opacity modifier on a colour
  <div className="hover:bg-primary/80" />, // ✗ Opacity modifier on a colour
  <div className={cn("aria-invalid:ring-destructive/20")} />, // ✗ Opacity modifier on a colour
  <div className="group/button w-1/2 opacity-50 disabled:opacity-50" />,
]
