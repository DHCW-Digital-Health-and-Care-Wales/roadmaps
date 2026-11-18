import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createRef } from "react"
import { describe, expect, it, vi } from "vitest"

import { renderWithI18n } from "@/test/render-with-i18n"

import { FormDialog } from "./form-dialog"

function renderDialog(
  props: { busy?: boolean; language?: "en" | "cy"; onClose?: () => void } = {},
) {
  const { busy = false, language, onClose = vi.fn() } = props
  renderWithI18n(
    <FormDialog
      open
      title="A form"
      busy={busy}
      onClose={onClose}
      opener={createRef()}
    >
      {() => <input aria-label="First field" />}
    </FormDialog>,
    { language },
  )
  return onClose
}

describe("FormDialog's close button (STY-068)", () => {
  it.each([
    ["en", "Close"],
    ["cy", "Cau"],
  ] as const)("is named for the %s interface (S4)", (language, name) => {
    renderDialog({ language })

    expect(screen.getByRole("button", { name })).toBeInTheDocument()
  })

  it("closes the dialog as Cancel does, through the caller (S2)", async () => {
    const onClose = renderDialog()

    await userEvent.click(screen.getByRole("button", { name: "Close" }))

    expect(onClose).toHaveBeenCalledOnce()
  })

  it("waits while a write is under way: it is disabled and closes nothing (S5)", async () => {
    const onClose = renderDialog({ busy: true })

    const close = screen.getByRole("button", { name: "Close" })
    await userEvent.click(close)

    expect(close).toBeDisabled()
    expect(onClose).not.toHaveBeenCalled()
  })
})
