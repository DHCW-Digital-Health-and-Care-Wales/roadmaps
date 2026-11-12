import { useLayoutEffect, useRef, useState } from "react"

/**
 * Whether a form is open in place of what it edits, and the Edit button focus returns to
 * when it closes (S3) or its changes are undone.
 */
export function useEditMode() {
  const [editing, setEditing] = useState(false)
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
    editing,
    editButton,
    open: () => {
      setEditing(true)
    },
    close: () => {
      setEditing(false)
      refocus()
    },
    refocus,
  }
}
