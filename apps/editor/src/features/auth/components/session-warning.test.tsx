import { act, fireEvent, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { AuthState } from "@/domain/auth/auth-client"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import type { Language } from "@/i18n"
import { renderWithProviders } from "@/test/render-with-providers"

const MINUTE_MS = 60_000
const roadmaps = [createTestRoadmap("producta", "Product A roadmap")]

afterEach(() => {
  vi.useRealTimers()
})

/**
 * Renders the loaded roadmaps, then (on fake timers) moves the session's end to
 * `endsInMs` from now.
 * Rendering happens on real timers: the router loads on them. Events are fired directly:
 * user-event's wrapper waits on a timer that Vitest's fake timers never run.
 */
async function renderSession(endsInMs: number, language: Language = "en") {
  const setup = await renderWithProviders({
    roadmaps,
    language,
    authState: { status: "connected", expiresAt: Date.now() + 60 * MINUTE_MS },
  })
  // The roadmaps load first, as they would have long before a warning.
  expect(await screen.findByRole("link", { name: /Product A/ })).toBeVisible()
  vi.useFakeTimers({ now: Date.now() })
  const session: Extract<AuthState, { status: "connected" }> = {
    status: "connected",
    expiresAt: Date.now() + endsInMs,
  }
  act(() => {
    setup.authClient.setState(session)
  })
  // The warning reads the clock as the session starts.
  advance(0)
  return { ...setup, session }
}

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

function dialog() {
  return screen.queryByRole("alertdialog")
}

/** The dialog's live region: what has been announced. */
function announcement() {
  const open = screen.getByRole("alertdialog")
  return within(open).getByRole("status").textContent
}

describe("the session warning (S3)", () => {
  it("opens two minutes before the session ends, with the time left and two choices", async () => {
    await renderSession(3 * MINUTE_MS)

    advance(MINUTE_MS - 1)
    expect(dialog()).not.toBeInTheDocument()

    advance(1)
    const open = screen.getByRole("alertdialog", {
      name: "Your session is about to end",
    })
    expect(open).toHaveAccessibleDescription(
      "Your session ends in 2 minutes. After that, you'll need to reconnect.",
    )
    const stay = within(open).getByRole("button", { name: "Stay connected" })
    expect(
      within(open).getByRole("button", { name: "Disconnect" }),
    ).toBeInTheDocument()
    expect(within(open).getByRole("button", { name: "Close" })).toBeVisible()
    await vi.waitFor(() => {
      expect(stay).toHaveFocus()
    })
  })

  it("counts down in minutes and seconds", async () => {
    await renderSession(2 * MINUTE_MS)

    advance(11_000)
    expect(dialog()).toHaveTextContent(
      "Your session ends in 1 minute and 49 seconds.",
    )

    advance(79_000)
    expect(dialog()).toHaveTextContent("Your session ends in 30 seconds.")
  })

  it("announces the time left each minute, then at 30 seconds, never every second", async () => {
    await renderSession(2 * MINUTE_MS)
    // Opening reads the description, so nothing more is announced yet.
    expect(announcement()).toBe("")

    advance(59_000)
    expect(announcement()).toBe("")
    advance(1_000)
    expect(announcement()).toBe("Your session ends in 1 minute.")
    advance(29_000)
    expect(announcement()).toBe("Your session ends in 1 minute.")
    advance(1_000)
    expect(announcement()).toBe("Your session ends in 30 seconds.")
    advance(29_000)
    expect(announcement()).toBe("Your session ends in 30 seconds.")
  })

  it("announces the real time left when a background tab reaches a moment late", async () => {
    const { session } = await renderSession(2 * MINUTE_MS)
    expect(announcement()).toBe("")

    // Throttled in the background: the next tick lands well after the 30-second moment.
    vi.setSystemTime(session.expiresAt - 25_000)
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"))
    })

    expect(announcement()).toBe("Your session ends in 25 seconds.")
    advance(5_000)
    expect(announcement()).toBe("Your session ends in 25 seconds.")
  })

  it("closes when the session ends", async () => {
    const { authClient } = await renderSession(30_000)
    expect(dialog()).toBeInTheDocument()

    act(() => {
      authClient.setState({ status: "expired" })
    })

    expect(dialog()).not.toBeInTheDocument()
  })
})

describe("staying connected (S4)", () => {
  it("renews inside the click, closes and gives focus back, keeping the roadmaps", async () => {
    const { authClient } = await renderSession(3 * MINUTE_MS)
    const refresh = screen.getByRole("button", { name: "Refresh" })
    refresh.focus()
    advance(MINUTE_MS)

    fireEvent.click(screen.getByRole("button", { name: "Stay connected" }))

    expect(authClient.connect).toHaveBeenCalledOnce()
    await vi.waitFor(() => {
      expect(dialog()).not.toBeInTheDocument()
      expect(refresh).toHaveFocus()
    })
    expect(
      screen.getByRole("link", { name: "Product A roadmap" }),
    ).toBeInTheDocument()
    // The fake renewed the session for an hour: no warning until near its end.
    advance(50 * MINUTE_MS)
    expect(dialog()).not.toBeInTheDocument()
  })

  it("gives focus back to the page itself when that is where it was", async () => {
    await renderSession(3 * MINUTE_MS)
    const page = screen.getByRole("main")
    page.focus()
    advance(MINUTE_MS)
    await vi.waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Stay connected" }),
      ).toHaveFocus()
    })

    fireEvent.keyDown(screen.getByRole("button", { name: "Stay connected" }), {
      key: "Escape",
    })

    await vi.waitFor(() => {
      expect(dialog()).not.toBeInTheDocument()
      expect(page).toHaveFocus()
    })
  })

  it("warns again before the renewed session ends", async () => {
    await renderSession(2 * MINUTE_MS)

    fireEvent.click(screen.getByRole("button", { name: "Stay connected" }))
    advance(58 * MINUTE_MS)

    expect(dialog()).toBeInTheDocument()
  })
})

describe("a renewal that fails (S5)", () => {
  it("closes the warning and shows why at the top of the page", async () => {
    const { authClient, session } = await renderSession(2 * MINUTE_MS)
    authClient.connect.mockImplementationOnce(() => {
      authClient.setState({ ...session, lastError: "popup-blocked" })
    })

    fireEvent.click(screen.getByRole("button", { name: "Stay connected" }))

    expect(dialog()).not.toBeInTheDocument()
    expect(
      within(screen.getByRole("main")).getByRole("alert"),
    ).toHaveTextContent("Couldn't keep you connected")
    // It does not come back for the same session.
    advance(MINUTE_MS)
    expect(dialog()).not.toBeInTheDocument()
  })
})

describe("dismissing, or returning late (S6)", () => {
  it.each([
    [
      "Escape",
      (stay: HTMLElement) => {
        fireEvent.keyDown(stay, { key: "Escape" })
      },
    ],
    [
      "Close",
      () => {
        fireEvent.click(screen.getByRole("button", { name: "Close" }))
      },
    ],
  ])("leaves the session to run out after %s", async (_, dismiss) => {
    const { authClient } = await renderSession(2 * MINUTE_MS)
    const stay = screen.getByRole("button", { name: "Stay connected" })
    await vi.waitFor(() => {
      expect(stay).toHaveFocus()
    })

    dismiss(stay)

    expect(dialog()).not.toBeInTheDocument()
    expect(authClient.connect).not.toHaveBeenCalled()
    expect(authClient.disconnect).not.toHaveBeenCalled()
    advance(MINUTE_MS)
    expect(dialog()).not.toBeInTheDocument()

    act(() => {
      authClient.setState({ status: "expired" })
    })
    expect(screen.getByText("Your session has expired")).toBeInTheDocument()
  })

  it("disconnects when asked", async () => {
    const { authClient } = await renderSession(2 * MINUTE_MS)

    fireEvent.click(
      within(screen.getByRole("alertdialog")).getByRole("button", {
        name: "Disconnect",
      }),
    )

    expect(authClient.disconnect).toHaveBeenCalledOnce()
    expect(dialog()).not.toBeInTheDocument()
  })

  it("shows the right time left when a background tab returns in time", async () => {
    const { session } = await renderSession(10 * MINUTE_MS)

    // Timers held back in a background tab: the clock moves, nothing fires.
    vi.setSystemTime(session.expiresAt - 45_000)
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"))
    })

    expect(dialog()).toHaveTextContent("Your session ends in 45 seconds.")
  })

  it("stays closed when a background tab returns after the session ended", async () => {
    const { session } = await renderSession(10 * MINUTE_MS)

    vi.setSystemTime(session.expiresAt + 1_000)
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"))
    })

    expect(dialog()).not.toBeInTheDocument()
  })
})

describe("the session warning in Welsh (S7)", () => {
  it("is Welsh throughout, countdown included", async () => {
    await renderSession(2 * MINUTE_MS, "cy")

    const open = screen.getByRole("alertdialog", {
      name: "Mae eich sesiwn ar fin dod i ben",
    })
    expect(open).toHaveTextContent(
      "Bydd eich sesiwn yn dod i ben ymhen 2 funud.",
    )
    expect(open).toHaveTextContent("Ar ôl hynny, bydd angen i chi ailgysylltu.")
    expect(
      within(open).getByRole("button", { name: "Aros yn gysylltiedig" }),
    ).toBeInTheDocument()
    expect(
      within(open).getByRole("button", { name: "Datgysylltu" }),
    ).toBeInTheDocument()
    expect(
      within(open).getByRole("button", { name: "Cau" }),
    ).toBeInTheDocument()

    advance(11_000)
    expect(open).toHaveTextContent("1 munud, 49 eiliad")
    advance(49_000)
    expect(within(open).getByRole("status")).toHaveTextContent(
      "Bydd eich sesiwn yn dod i ben ymhen 1 munud.",
    )
  })
})
