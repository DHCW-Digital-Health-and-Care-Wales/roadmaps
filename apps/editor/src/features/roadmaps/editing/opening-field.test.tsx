import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import type { Language } from "@/i18n"
import { renderWithI18n } from "@/test/render-with-i18n"

import { expectOpeningFocus } from "../testing/opening-focus"

import { OpeningField } from "./opening-field"

/**
 * A second field, not the Organisations one: a list of names with a box to add one,
 * the box taking focus as it opens, as the Tags field's "Add a tag" will (STY-037 S19).
 */
function NamesField({
  initial = [],
  hint,
}: {
  initial?: readonly string[]
  hint?: string
}) {
  const [names, setNames] = useState(initial)
  const [typed, setTyped] = useState("")
  const add = () => {
    if (typed === "") return
    setNames([...names, typed])
    setTyped("")
  }
  return (
    <OpeningField
      label="Names"
      subject="names"
      summary={names.length > 0 ? names.join(", ") : null}
      none="No names"
      hint={hint}
      onShut={add}
    >
      {(focusOnOpen) => (
        <>
          {names.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                setNames(names.filter((each) => each !== name))
              }}
            >
              {`Remove ${name}`}
            </button>
          ))}
          <input
            ref={focusOnOpen}
            aria-label="Add a name"
            value={typed}
            onChange={(event) => {
              setTyped(event.target.value)
            }}
          />
          <button type="button" onClick={add}>
            Add name
          </button>
        </>
      )}
    </OpeningField>
  )
}

function renderField(
  props: Parameters<typeof NamesField>[0] = {},
  language?: Language,
) {
  const user = userEvent.setup()
  const submit = vi.fn()
  renderWithI18n(
    <form
      aria-label="Example"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <NamesField {...props} />
    </form>,
    { language },
  )
  return { user, submit }
}

describe("OpeningField (EPC-009, a field that opens on request)", () => {
  it("starts shut: its label, what it holds on one line and a button named with the field", () => {
    renderField({ initial: ["Ada", "Grace"] })

    expect(screen.getByText("Names")).toBeVisible()
    expect(screen.getByText("Ada, Grace")).toBeVisible()
    const button = screen.getByRole("button", { name: "Change names" })
    expect(button).toHaveAttribute("aria-expanded", "false")
    expect(button).toHaveTextContent(/^Change\s+names$/)
    expect(screen.queryByRole("group")).toBeNull()
    expect(screen.queryByRole("textbox")).toBeNull()
  })

  it("says it holds nothing, beside a button to add", () => {
    renderField()

    expect(screen.getByText("No names")).toBeVisible()
    expect(screen.getByRole("button", { name: "Add names" })).toHaveAttribute(
      "aria-expanded",
      "false",
    )
    expect(screen.queryByRole("button", { name: "Change names" })).toBeNull()
  })

  it("opens in place: its controls in a group named by its label, focus on the one it names", async () => {
    const { user, submit } = renderField({ initial: ["Ada", "Grace"] })

    await user.click(screen.getByRole("button", { name: "Change names" }))

    const group = screen.getByRole("group", { name: "Names" })
    expect(
      within(group).getByRole("button", { name: "Remove Ada" }),
    ).toBeVisible()
    // Not the first control of the field, but the one the field names.
    await expectOpeningFocus(() =>
      within(group).getByRole("textbox", { name: "Add a name" }),
    )
    const button = screen.getByRole("button", { name: "Close names" })
    expect(button).toHaveAttribute("aria-expanded", "true")
    expect(button).toHaveAttribute("aria-controls", group.id)
    expect(screen.queryByText("Ada, Grace")).toBeNull()
    expect(submit).not.toHaveBeenCalled()
  })

  it("shuts keeping what was changed, focus staying on its button", async () => {
    const { user, submit } = renderField({ initial: ["Ada", "Grace"] })
    await user.click(screen.getByRole("button", { name: "Change names" }))
    await user.type(screen.getByRole("textbox", { name: "Add a name" }), "Mary")
    await user.click(screen.getByRole("button", { name: "Add name" }))
    await user.click(screen.getByRole("button", { name: "Remove Ada" }))

    await user.click(screen.getByRole("button", { name: "Close names" }))

    const button = screen.getByRole("button", { name: "Change names" })
    expect(button).toHaveFocus()
    expect(button).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByText("Grace, Mary")).toBeVisible()
    await waitFor(() => {
      expect(screen.queryByRole("group")).toBeNull()
    })
    expect(submit).not.toHaveBeenCalled()
  })

  it("moves focus to its button on shutting, where pressing a button does not focus it", async () => {
    const { user } = renderField({ initial: ["Ada"] })
    await user.click(screen.getByRole("button", { name: "Change names" }))
    await expectOpeningFocus(() =>
      screen.getByRole("textbox", { name: "Add a name" }),
    )

    // A click that leaves focus where it was, as Safari's does on a button.
    fireEvent.click(screen.getByRole("button", { name: "Close names" }))

    expect(screen.getByRole("button", { name: "Change names" })).toHaveFocus()
    await waitFor(() => {
      expect(screen.queryByRole("group")).toBeNull()
    })
    expect(screen.getByRole("button", { name: "Change names" })).toHaveFocus()
  })

  it("tells the field it is being shut, so text typed but not yet added is kept", async () => {
    const { user } = renderField({ initial: ["Ada"] })
    await user.click(screen.getByRole("button", { name: "Change names" }))
    await user.type(screen.getByRole("textbox", { name: "Add a name" }), "Mary")

    await user.click(screen.getByRole("button", { name: "Close names" }))

    expect(screen.getByText("Ada, Mary")).toBeVisible()
  })

  it("opens and shuts by keyboard alone", async () => {
    const { user } = renderField({ initial: ["Ada"] })

    await user.tab()
    expect(screen.getByRole("button", { name: "Change names" })).toHaveFocus()
    await user.keyboard("{Enter}")
    await expectOpeningFocus(() =>
      screen.getByRole("textbox", { name: "Add a name" }),
    )

    await user.tab({ shift: true })
    await user.tab({ shift: true })
    expect(screen.getByRole("button", { name: "Close names" })).toHaveFocus()
    await user.keyboard(" ")
    expect(screen.getByRole("button", { name: "Change names" })).toHaveFocus()
  })

  it("says its hint shut and open, of its button and of its group", async () => {
    const hint = "Ada isn't recognised."
    const { user } = renderField({ initial: ["Ada"], hint })

    expect(screen.getByText(hint)).toBeVisible()
    expect(
      screen.getByRole("button", { name: "Change names" }),
    ).toHaveAccessibleDescription(hint)

    await user.click(screen.getByRole("button", { name: "Change names" }))

    expect(screen.getByText(hint)).toBeVisible()
    expect(
      screen.getByRole("group", { name: "Names" }),
    ).toHaveAccessibleDescription(hint)
  })

  it("names its button in Welsh", async () => {
    const { user } = renderField({}, "cy")

    await user.click(screen.getByRole("button", { name: "Ychwanegu names" }))
    await user.type(screen.getByRole("textbox", { name: "Add a name" }), "Ada")
    await user.click(screen.getByRole("button", { name: "Add name" }))
    await user.click(screen.getByRole("button", { name: "Cau names" }))

    expect(screen.getByRole("button", { name: "Newid names" })).toHaveFocus()
  })
})
