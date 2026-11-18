import { act, fireEvent, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { AuthState } from "@/domain/auth/auth-client"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { renderWithProviders } from "@/test/render-with-providers"

import { CONFIRMATION_DWELL_MS } from "../use-notice-dwell"
import { disconnectFromHeader } from "@/features/auth/testing/account-menu"

const HOUR_MS = 60 * 60 * 1000
const connected = (): Extract<AuthState, { status: "connected" }> => ({
  status: "connected",
  expiresAt: Date.now() + HOUR_MS,
})
const roadmaps = [createTestRoadmap("producta", "Product A roadmap")]

function main() {
  return within(screen.getByRole("main"))
}

/** True when `a` comes before `b` in the document. */
function precedes(a: Element, b: Element): boolean {
  return Boolean(
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING,
  )
}

describe("the page notice (S1: failures stay on screen)", () => {
  it.each<[AuthState, string]>([
    [
      { status: "error", error: "access-denied" },
      "Access wasn't granted, so your roadmaps can't be loaded.",
    ],
    [
      { status: "error", error: "scope-not-granted" },
      "Access to Google Sheets is needed to load your roadmaps. Connect again and allow it.",
    ],
    [
      { status: "error", error: "unknown" },
      "Something went wrong while connecting to Google. Please try again.",
    ],
    [
      { status: "error", error: "script-load-failed" },
      "Google couldn't be reached. Check your internet connection and try again.",
    ],
    [
      { status: "ready", lastError: "popup-blocked" },
      "Your browser blocked the Google window. Allow pop-ups for this site and try again.",
    ],
  ])(
    "announces a failed connection (%j) above the page's heading",
    async (authState, text) => {
      await renderWithProviders({ authState })

      const alert = main().getByRole("alert")
      expect(alert).toHaveTextContent(text)
      expect(precedes(alert, main().getByRole("heading", { level: 1 }))).toBe(
        true,
      )
    },
  )

  it("shows a closed popup without interrupting: the user closed it", async () => {
    await renderWithProviders({
      authState: { status: "ready", lastError: "popup-closed" },
    })

    expect(main().queryByRole("alert")).not.toBeInTheDocument()
    expect(main().getByRole("note")).toHaveTextContent(
      "The Google window was closed before connecting finished.",
    )
  })

  it("shows a failure from the header on the page in view, over the roadmaps", async () => {
    const { authClient } = await renderWithProviders({
      authState: connected(),
      roadmaps,
    })
    expect(
      await main().findByRole("link", { name: "Product A roadmap" }),
    ).toBeInTheDocument()

    act(() => {
      authClient.setState({ status: "expired" })
    })
    act(() => {
      authClient.setState({ status: "connecting" })
    })
    act(() => {
      authClient.setState({ status: "expired", lastError: "popup-blocked" })
    })

    const notice = main()
      .getAllByRole("alert")
      .find((alert) => alert.textContent.includes("blocked the Google window"))
    expect(notice).toBeDefined()
    expect(
      main().getByRole("link", { name: "Product A roadmap" }),
    ).toBeInTheDocument()
  })

  it("is announced again when the same failure happens again", async () => {
    const { authClient } = await renderWithProviders({
      authState: { status: "ready", lastError: "popup-blocked" },
    })
    const first = main().getByRole("alert")

    // Google may report a blocked popup inside the click, so React never renders the
    // attempt's `connecting` state in between.
    act(() => {
      authClient.setState({ status: "connecting" })
      authClient.setState({ status: "ready", lastError: "popup-blocked" })
    })

    const second = main().getByRole("alert")
    expect(second).toHaveTextContent(first.textContent)
    expect(second).not.toBe(first)
  })

  it("stays until the next attempt", async () => {
    const { authClient } = await renderWithProviders({
      authState: { status: "error", error: "access-denied" },
    })
    expect(main().getByRole("alert")).toBeInTheDocument()

    act(() => {
      authClient.setState({ status: "connecting" })
    })

    expect(main().queryByRole("alert")).not.toBeInTheDocument()
  })

  it("stays until dismissed, then moves focus to the page", async () => {
    const user = userEvent.setup()
    const { authClient } = await renderWithProviders({
      authState: { status: "error", error: "access-denied" },
    })

    await user.click(main().getByRole("button", { name: "Dismiss message" }))

    expect(main().queryByRole("alert")).not.toBeInTheDocument()
    expect(screen.getByRole("main")).toHaveFocus()

    // The next failure is a new notice.
    act(() => {
      authClient.setState({ status: "connecting" })
    })
    act(() => {
      authClient.setState({ status: "error", error: "access-denied" })
    })
    expect(main().getByRole("alert")).toBeInTheDocument()
  })
})

describe("the page notice (S5: a renewal that fails)", () => {
  it("says the session continues and when to reconnect, until it expires", async () => {
    const session = connected()
    const { authClient } = await renderWithProviders({
      authState: session,
      roadmaps,
    })
    expect(
      await main().findByRole("link", { name: "Product A roadmap" }),
    ).toBeInTheDocument()

    act(() => {
      authClient.setState({ ...session, lastError: "popup-blocked" })
    })

    const alert = main().getByRole("alert")
    expect(alert).toHaveTextContent("Couldn't keep you connected")
    expect(alert).toHaveTextContent(
      "Your browser blocked the Google window. Allow pop-ups for this site and try again.",
    )
    expect(alert).toHaveTextContent(
      "You'll need to reconnect when your session ends.",
    )
    expect(precedes(alert, main().getByRole("heading", { level: 1 }))).toBe(
      true,
    )
    expect(
      main().getByRole("link", { name: "Product A roadmap" }),
    ).toBeInTheDocument()

    act(() => {
      authClient.setState({ status: "expired" })
    })

    expect(
      main().queryByText("Couldn't keep you connected"),
    ).not.toBeInTheDocument()
    expect(main().getByText("Your session has expired")).toBeInTheDocument()
  })

  it("is in Welsh (S7), and only a note when the user closed the popup", async () => {
    await renderWithProviders({
      language: "cy",
      authState: { ...connected(), lastError: "popup-closed" },
      roadmaps,
    })

    const alert = main().getByRole("note")
    expect(alert).toHaveTextContent("Doedd dim modd cadw eich cysylltiad")
    expect(alert).toHaveTextContent(
      "Caewyd ffenestr Google cyn i'r cysylltu orffen.",
    )
    expect(alert).toHaveTextContent(
      "Bydd angen i chi ailgysylltu pan ddaw eich sesiwn i ben.",
    )
    expect(
      main().getByRole("button", { name: "Cau'r neges" }),
    ).toBeInTheDocument()
  })
})

describe("the page notice (S2: confirmations)", () => {
  it("confirms disconnecting where the user is looking, but not connecting (STY-056 S1)", async () => {
    const user = userEvent.setup()
    await renderWithProviders({ roadmaps })

    await user.click(main().getByRole("button", { name: "Connect Google" }))
    expect(
      await main().findByRole("link", { name: "Product A roadmap" }),
    ).toBeInTheDocument()
    expect(main().queryByRole("note")).not.toBeInTheDocument()

    await disconnectFromHeader(user)
    expect(main().getByRole("note")).toHaveTextContent(
      "Disconnected from Google",
    )
  })

  it("stays silent when a session is renewed", async () => {
    const session = connected()
    const { authClient } = await renderWithProviders({
      authState: session,
      roadmaps,
    })

    act(() => {
      authClient.setState({
        ...session,
        expiresAt: session.expiresAt + HOUR_MS,
      })
    })

    expect(main().queryByRole("note")).not.toBeInTheDocument()
    expect(main().queryByRole("alert")).not.toBeInTheDocument()
  })

  it("is not repeated by an expiry, and clears on the next page", async () => {
    const user = userEvent.setup()
    const { authClient, router } = await renderWithProviders({
      authState: connected(),
      roadmaps,
    })
    await disconnectFromHeader(user)
    expect(main().getByRole("note")).toHaveTextContent(
      "Disconnected from Google",
    )

    await act(() =>
      router.navigate({
        to: "/roadmaps/$roadmapId",
        params: { roadmapId: "producta" },
      }),
    )
    expect(main().queryByRole("note")).not.toBeInTheDocument()

    // Coming back to the list does not bring it back.
    await act(() => router.navigate({ to: "/" }))
    expect(main().queryByRole("note")).not.toBeInTheDocument()

    act(() => {
      authClient.setState(connected())
    })
    act(() => {
      authClient.setState({ status: "expired" })
    })
    expect(main().queryByRole("note")).not.toBeInTheDocument()
  })
})

describe("the page notice (S2: confirmations clear themselves)", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  /**
   * Renders a connected page, then (on fake timers) disconnects. Rendering happens on real
   * timers, as the router loads on them; events are fired directly, since user-event's
   * wrapper waits on a timer Vitest's fake timers never run.
   */
  async function renderDisconnected() {
    const setup = await renderWithProviders({
      authState: connected(),
      roadmaps,
    })
    vi.useFakeTimers({ now: Date.now() })
    act(() => {
      setup.authClient.setState({ status: "ready" })
    })
    expect(main().getByRole("note")).toHaveTextContent(
      "Disconnected from Google",
    )
    return setup
  }

  function advance(ms: number) {
    act(() => {
      vi.advanceTimersByTime(ms)
    })
  }

  function note() {
    return main().queryByRole("note")
  }

  it("clears a confirmation after its dwell, leaving the status for assistive technology", async () => {
    await renderDisconnected()

    advance(CONFIRMATION_DWELL_MS - 1)
    expect(note()).toBeInTheDocument()
    advance(1)

    expect(note()).not.toBeInTheDocument()
    expect(
      within(screen.getByRole("banner")).getByRole("status"),
    ).toHaveTextContent("Not connected")
  })

  it("waits while the pointer is over it, and starts again once it leaves", async () => {
    await renderDisconnected()
    const notice = main().getByRole("note")

    fireEvent.pointerEnter(notice)
    advance(3 * CONFIRMATION_DWELL_MS)
    expect(note()).toBeInTheDocument()

    fireEvent.pointerLeave(notice)
    advance(CONFIRMATION_DWELL_MS - 1)
    expect(note()).toBeInTheDocument()
    advance(1)
    expect(note()).not.toBeInTheDocument()
  })

  it("waits while focus is inside it, and starts again once focus leaves", async () => {
    await renderDisconnected()
    const dismiss = main().getByRole("button", { name: "Dismiss message" })

    act(() => {
      dismiss.focus()
    })
    advance(3 * CONFIRMATION_DWELL_MS)
    expect(note()).toBeInTheDocument()

    act(() => {
      dismiss.blur()
    })
    advance(CONFIRMATION_DWELL_MS - 1)
    expect(note()).toBeInTheDocument()
    advance(1)
    expect(note()).not.toBeInTheDocument()
  })

  it("gives a newer confirmation a full dwell of its own", async () => {
    const { authClient } = await renderDisconnected()
    advance(CONFIRMATION_DWELL_MS - 1_000)

    act(() => {
      authClient.setState(connected())
    })
    act(() => {
      authClient.setState({ status: "ready" })
    })
    expect(note()).toHaveTextContent("Disconnected from Google")
    advance(CONFIRMATION_DWELL_MS - 1)
    expect(note()).toBeInTheDocument()
    advance(1)
    expect(note()).not.toBeInTheDocument()
  })

  it("keeps its dwell through an unrelated re-render", async () => {
    const { i18n } = await renderDisconnected()
    advance(CONFIRMATION_DWELL_MS - 1_000)

    await act(() => i18n.changeLanguage("cy"))
    expect(note()).toHaveTextContent("Wedi datgysylltu o Google")
    advance(1_000)

    expect(note()).not.toBeInTheDocument()
  })

  it("never clears a failure, even one that replaced a confirmation", async () => {
    const { authClient } = await renderDisconnected()
    advance(CONFIRMATION_DWELL_MS - 1_000)

    act(() => {
      authClient.setState({ status: "expired" })
    })
    act(() => {
      authClient.setState({ status: "connecting" })
    })
    act(() => {
      authClient.setState({ status: "expired", lastError: "popup-blocked" })
    })
    advance(10 * CONFIRMATION_DWELL_MS)

    expect(
      main()
        .getAllByRole("alert")
        .some((alert) =>
          alert.textContent.includes("blocked the Google window"),
        ),
    ).toBe(true)
  })
})
