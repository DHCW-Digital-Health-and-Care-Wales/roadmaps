import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
} from "./alert-dialog"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogForm,
  DialogHeader,
  DialogTitle,
} from "./dialog"

describe("DialogContent's corner close button (STY-068)", () => {
  it("is a button named by the caller's label, its icon hidden from assistive technology (S4)", () => {
    render(
      <Dialog open>
        <DialogContent closeLabel="Cau">
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    )

    const close = screen.getByRole("button", { name: "Cau" })
    expect(close.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
  })

  it("closes the dialog", async () => {
    const onOpenChange = vi.fn()
    render(
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent closeLabel="Close">
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    )

    await userEvent.click(screen.getByRole("button", { name: "Close" }))

    expect(onOpenChange).toHaveBeenCalledWith(false, expect.anything())
  })

  it("follows the dialog's controls, so Tab from the last one wraps to it (S6)", () => {
    render(
      <Dialog open>
        <DialogContent closeLabel="Close">
          <DialogTitle>Title</DialogTitle>
          <DialogFooter>
            <button type="button">Done</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    )

    const names = within(screen.getByRole("dialog"))
      .getAllByRole("button")
      .map((button) => button.textContent)
    expect(names).toEqual(["Done", "Close"])
  })

  it("is disabled while `closeDisabled` holds the dialog (S5)", () => {
    render(
      <Dialog open>
        <DialogContent closeLabel="Close" closeDisabled>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    )

    expect(screen.getByRole("button", { name: "Close" })).toBeDisabled()
  })

  it("is left out by `showCloseButton={false}`", () => {
    render(
      <Dialog open>
        <DialogContent closeLabel="Close" showCloseButton={false}>
          <DialogTitle>Title</DialogTitle>
        </DialogContent>
      </Dialog>,
    )

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})

describe("a dialog's header, body and footer (STY-076)", () => {
  it("keeps the body and the footer in the form, so Done submits it, and the header outside it (S1)", () => {
    render(
      <Dialog open>
        <DialogContent closeLabel="Close">
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
          </DialogHeader>
          <DialogForm aria-label="Form">
            <DialogBody>
              <input aria-label="Field" />
            </DialogBody>
            <DialogFooter>
              <button type="submit">Done</button>
            </DialogFooter>
          </DialogForm>
        </DialogContent>
      </Dialog>,
    )

    const form = screen.getByRole("form", { name: "Form" })
    expect(form).toContainElement(
      screen.getByRole("textbox", { name: "Field" }),
    )
    expect(form).toContainElement(screen.getByRole("button", { name: "Done" }))
    expect(form).not.toContainElement(
      screen.getByRole("heading", { name: "Title" }),
    )
  })

  it("tabs through the header, the body and the footer in DOM order, then the close button (S7)", async () => {
    render(
      <Dialog open>
        <DialogContent closeLabel="Close" initialFocus={false}>
          <DialogHeader>
            <DialogTitle>Title</DialogTitle>
          </DialogHeader>
          <DialogForm aria-label="Form">
            <DialogBody>
              <input aria-label="Field" />
            </DialogBody>
            <DialogFooter>
              <button type="submit">Done</button>
            </DialogFooter>
          </DialogForm>
        </DialogContent>
      </Dialog>,
    )

    const order: string[] = []
    const field = screen.getByRole("textbox", { name: "Field" })
    field.focus()
    for (let step = 0; step < 2; step++) {
      await userEvent.tab()
      order.push(document.activeElement?.textContent ?? "")
    }

    expect(order).toEqual(["Done", "Close"])
  })
})

describe("AlertDialogContent (STY-068 S8)", () => {
  it("has no close button: it is left by its own answers", () => {
    render(
      <AlertDialog open>
        <AlertDialogContent>
          <AlertDialogTitle>Question?</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>,
    )

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
