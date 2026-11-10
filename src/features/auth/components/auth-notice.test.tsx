import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { act } from "react"
import { describe, expect, it } from "vitest"

import type { AuthState } from "@/domain/auth/auth-client"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { renderWithProviders } from "@/test/render-with-providers"

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
  it("confirms connecting and disconnecting where the user is looking", async () => {
    const user = userEvent.setup()
    await renderWithProviders({ roadmaps })

    await user.click(main().getByRole("button", { name: "Connect Google" }))
    expect(main().getByRole("note")).toHaveTextContent("Connected to Google")

    await user.click(
      within(screen.getByRole("banner")).getByRole("button", {
        name: "Disconnect",
      }),
    )
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
    const { authClient, router } = await renderWithProviders({ roadmaps })
    await user.click(main().getByRole("button", { name: "Connect Google" }))
    expect(main().getByRole("note")).toHaveTextContent("Connected to Google")

    await act(() =>
      router.navigate({
        to: "/roadmaps/$roadmapId",
        params: { roadmapId: "producta" },
      }),
    )
    expect(main().queryByRole("note")).not.toBeInTheDocument()

    act(() => {
      authClient.setState({ status: "expired" })
    })
    expect(main().queryByRole("note")).not.toBeInTheDocument()
  })
})
