import type { ComponentProps, ComponentType } from "react"

import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface RowButtonProps extends ComponentProps<typeof Button> {
  /** Shows `Icon` in place of `word`, which stays the button's name (S16). */
  icons: boolean
  Icon: ComponentType<{ "aria-hidden": "true" }>
  word: string
  /** Follows `word`, for assistive technology: the button's tag. */
  subject: string
}

/** One of a tag row's buttons, in words, or as an icon where words would not fit. */
export function RowButton({
  icons,
  Icon,
  word,
  subject,
  ...props
}: RowButtonProps) {
  return (
    <Button
      type="button"
      variant="secondary"
      size={icons ? "icon-sm" : "sm"}
      title={icons ? word : undefined}
      {...props}
    >
      {icons && <Icon aria-hidden="true" />}
      <span className={cn(icons && "sr-only")}>{word}</span>{" "}
      <span className="sr-only">{subject}</span>
    </Button>
  )
}

/**
 * Each tag at its own width, after a row's buttons in words, for `useRowIcons` to
 * measure whether they fit side by side, finding it by `data-tag-probe`: never seen, and
 * no part of the list for assistive technology.
 */
export function RowProbe({
  tags,
  words,
}: {
  tags: readonly string[]
  words: readonly string[]
}) {
  return (
    <li
      role="presentation"
      aria-hidden="true"
      data-tag-probe=""
      className="invisible absolute flex h-0 w-0 overflow-hidden whitespace-nowrap"
    >
      <span className="flex shrink-0 gap-2">
        {words.map((word) => (
          <span
            key={word}
            className={buttonVariants({ variant: "secondary", size: "sm" })}
          >
            {word}
          </span>
        ))}
      </span>
      {tags.map((tag) => (
        <Badge key={tag} className="max-w-none whitespace-nowrap">
          {tag}
        </Badge>
      ))}
    </li>
  )
}
