import { useLayoutEffect, useRef, useState } from "react"

/**
 * Whether a form is open in place of what it edits, what it was opened on (`opened`:
 * the record as read then, which its edits are made from, so a co-lead's change read
 * while it is open never changes what Done keeps), and the Edit button focus returns to
 * when it closes (S3) or its changes are undone.
 */
export function useEditMode<T>() {
  const [opened, setOpened] = useState<{ readonly value: T } | null>(null)
  const [focusRequests, setFocusRequests] = useState(0)
  const editButton = useRef<HTMLButtonElement>(null)
  // A layout effect, so focus moves before the shell would rescue it to `<main>`.
  useLayoutEffect(() => {
    if (focusRequests > 0) editButton.current?.focus()
  }, [focusRequests])
  const refocus = () => {
    setFocusRequests((count) => count + 1)
  }
  return {
    editing: opened !== null,
    opened: opened?.value,
    editButton,
    open: (value: T) => {
      setOpened({ value })
    },
    close: () => {
      setOpened(null)
      refocus()
    },
    refocus,
  }
}
