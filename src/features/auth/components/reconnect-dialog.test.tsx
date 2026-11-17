import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import type { AuthState } from "@/domain/auth/auth-client"
import type { Language } from "@/i18n"
import { connected } from "@/test/connected-state"
import { renderWithI18n } from "@/test/render-with-i18n"

import { AuthProvider } from "../auth-provider"
import { useSessionAction } from "../session-action"
import { createFakeAuthClient } from "../testing/fake-auth-client"
import { findReconnectDialog } from "../testing/reconnect-dialog"
import { ReconnectDialogProvider } from "./reconnect-dialog"

/** A control whose action needs a session, as every write and Refresh is. */
function Action({ onAction }: { onAction: (count: number) => void }) {
  const [count, setCount] = useState(0)
  // Carries on with the count as rendered then, not as it was when pressed.
  const run = useSessionAction(() => {
    onAction(count)
  })
  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          run(event.currentTarget)
        }}
      >
        Publish changes
      </button>
      <button
        type="button"
        onClick={() => {
          setCount((current) => current + 1)
        }}
      >
        Count
      </button>
    </>
  )
}

function renderAction(
  state: AuthState,
  { language, shown = true }: { language?: Language; shown?: boolean } = {},
) {
  const client = createFakeAuthClient(state)
  const onAction = vi.fn<(count: number) => void>()
  const tree = (show: boolean) => (
    <AuthProvider client={client}>
      <ReconnectDialogProvider>
        {show && <Action onAction={onAction} />}
      </ReconnectDialogProvider>
    </AuthProvider>
  )
  const result = renderWithI18n(tree(shown), { language })
  return {
    ...result,
    client,
    onAction,
    user: userEvent.setup(),
    hide: () => {
      result.rerender(tree(false))
    },
  }
}

const expired: AuthState = { status: "expired" }

function action() {
  return screen.getByRole("button", { name: "Publish changes" })
}

async function press(user: ReturnType<typeof userEvent.setup>) {
  await user.click(action())
  return findReconnectDialog()
}

describe("an action that needs a session (STY-057)", () => {
  it("runs at once while connected, asking nothing", async () => {
    const { user, onAction } = renderAction(connected)

    await user.click(action())

    expect(onAction).toHaveBeenCalledOnce()
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it("stays available after the session has expired, and asks to reconnect first (S1, S2)", async () => {
    const { user, onAction } = renderAction(expired)
    expect(action()).toBeEnabled()

    const dialog = await press(user)

    expect(dialog).toHaveAccessibleDescription(
      "Reconnect to Google to carry on. Your changes are kept in this tab.",
    )
    // Focus lags the dialog's opening.
    await waitFor(() => {
      expect(
        within(dialog).getByRole("button", { name: "Reconnect" }),
      ).toHaveFocus()
    })
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeVisible()
    expect(onAction).not.toHaveBeenCalled()
  })

  it("connects inside the Reconnect click, then closes and carries on, as rendered then (S3)", async () => {
    const { user, client, onAction } = renderAction(expired)
    const dialog = await press(user)
    // Google's popup is opened by the click itself (ADR-003).
    client.connect.mockImplementationOnce(() => {
      expect(onAction).not.toHaveBeenCalled()
      client.setState({ status: "connecting" })
    })

    await user.click(within(dialog).getByRole("button", { name: "Reconnect" }))
    expect(client.connect).toHaveBeenCalledOnce()
    expect(
      within(dialog).getByRole("button", { name: "Reconnect" }),
    ).toHaveAttribute("aria-busy", "true")
    expect(onAction).not.toHaveBeenCalled()

    act(() => {
      client.setState(connected)
    })

    await waitFor(() => {
      expect(onAction).toHaveBeenCalledExactlyOnceWith(0)
    })
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(action()).toHaveFocus()
  })

  it("carries on with the action as its component renders it once reconnected", async () => {
    const { user, client, onAction } = renderAction(expired)
    await press(user)
    // Rendered again while the dialog waits, as a read landing would.
    act(() => {
      screen.getByRole("button", { name: "Count", hidden: true }).click()
    })

    act(() => {
      client.setState(connected)
    })

    await waitFor(() => {
      expect(onAction).toHaveBeenCalledExactlyOnceWith(1)
    })
  })

  it("Cancel closes it, does nothing and returns focus to the pressed control (S4)", async () => {
    const { user, client, onAction } = renderAction(expired)
    const dialog = await press(user)

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }))

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(action()).toHaveFocus()
    act(() => {
      client.setState(connected)
    })
    expect(onAction).not.toHaveBeenCalled()
  })

  it("Escape cancels, even while Google's window is open, and a later connection carries nothing on (S4, S6)", async () => {
    const { user, client, onAction } = renderAction(expired)
    await press(user)
    client.connect.mockImplementationOnce(() => {
      client.setState({ status: "connecting" })
    })
    await user.click(screen.getByRole("button", { name: "Reconnect" }))

    await user.keyboard("{Escape}")

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(action()).toHaveFocus()
    act(() => {
      client.setState(connected)
    })
    expect(onAction).not.toHaveBeenCalled()
  })

  it.each<[string, AuthState, string]>([
    [
      "refused",
      { status: "error", error: "access-denied" },
      "Access wasn't granted, so your roadmaps can't be loaded.",
    ],
    [
      "its window closed",
      { status: "expired", lastError: "popup-closed" },
      "The Google window was closed before connecting finished.",
    ],
    [
      "its window closed after a refusal",
      { status: "ready", lastError: "popup-closed" },
      "The Google window was closed before connecting finished.",
    ],
    [
      "its window blocked",
      { status: "expired", lastError: "popup-blocked" },
      "Your browser blocked the Google window. Allow pop-ups for this site and try again.",
    ],
  ])(
    "says why when Google's access is %s, staying open to try again (S4)",
    async (_, failed, why) => {
      const { user, client, onAction } = renderAction(expired)
      const dialog = await press(user)
      client.connect.mockImplementationOnce(() => {
        client.setState(failed)
      })

      await user.click(
        within(dialog).getByRole("button", { name: "Reconnect" }),
      )

      const alert = within(dialog).getByRole("alert")
      expect(alert).toHaveTextContent("Couldn't reconnect")
      expect(alert).toHaveTextContent(why)
      expect(
        within(dialog).getByRole("button", { name: "Reconnect" }),
      ).toHaveFocus()
      expect(onAction).not.toHaveBeenCalled()

      // Trying again clears it; succeeding carries on.
      await user.click(
        within(dialog).getByRole("button", { name: "Reconnect" }),
      )
      await waitFor(() => {
        expect(onAction).toHaveBeenCalledOnce()
      })
    },
  )

  it("says nothing of a failure from before it opened", async () => {
    const { user } = renderAction({
      status: "expired",
      lastError: "popup-closed",
    })

    const dialog = await press(user)

    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument()
  })

  it("carries nothing on for a control that has gone by the time it reconnects", async () => {
    const { user, client, onAction, hide } = renderAction(expired)
    await press(user)

    hide()
    act(() => {
      client.setState(connected)
    })

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    })
    expect(onAction).not.toHaveBeenCalled()
  })

  it("is in Welsh, keeps focus inside and returns it by keyboard (S6)", async () => {
    const { user, onAction } = renderAction(expired, { language: "cy" })
    action().focus()

    await user.keyboard("{Enter}")

    const dialog = await findReconnectDialog("Mae eich sesiwn wedi dod i ben")
    expect(dialog).toHaveAccessibleDescription(
      "Ailgysylltwch â Google i barhau. Mae eich newidiadau wedi'u cadw yn y tab hwn.",
    )
    const reconnect = within(dialog).getByRole("button", {
      name: "Ailgysylltu",
    })
    const cancel = within(dialog).getByRole("button", { name: "Canslo" })
    await waitFor(() => {
      expect(reconnect).toHaveFocus()
    })
    await user.tab()
    expect(cancel).toHaveFocus()
    // Tab wraps round through the dialog's focus guard.
    await user.tab()
    await waitFor(() => {
      expect(reconnect).toHaveFocus()
    })

    await user.tab()
    await user.keyboard("{Enter}")

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    expect(action()).toHaveFocus()
    expect(onAction).not.toHaveBeenCalled()
  })
})
