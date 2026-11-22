import { act, render, renderHook, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { describe, expect, it } from "vitest"

import type { AuthClient } from "@/domain/auth/auth-client"

import { AuthProvider } from "./auth-provider"
import { createFakeAuthClient } from "./testing/fake-auth-client"
import { useAuth } from "./use-auth"

function AuthProbe() {
  const { state, connect, disconnect } = useAuth()
  return (
    <>
      <output>{state.status}</output>
      <button type="button" onClick={connect}>
        Connect
      </button>
      <button type="button" onClick={disconnect}>
        Disconnect
      </button>
    </>
  )
}

function withClient(client: AuthClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <AuthProvider client={client}>{children}</AuthProvider>
  }
}

describe("AuthProvider and useAuth", () => {
  it("renders the client's state and follows its changes", () => {
    const client = createFakeAuthClient({ status: "initializing" })
    render(<AuthProbe />, { wrapper: withClient(client) })

    expect(screen.getByRole("status")).toHaveTextContent("initializing")

    act(() => {
      client.setState({ status: "expired" })
    })

    expect(screen.getByRole("status")).toHaveTextContent("expired")
  })

  it("invokes the client's actions", async () => {
    const user = userEvent.setup()
    const client = createFakeAuthClient()
    render(<AuthProbe />, { wrapper: withClient(client) })

    await user.click(screen.getByRole("button", { name: "Connect" }))
    expect(client.connect).toHaveBeenCalledOnce()
    expect(screen.getByRole("status")).toHaveTextContent("connected")

    await user.click(screen.getByRole("button", { name: "Disconnect" }))
    expect(client.disconnect).toHaveBeenCalledOnce()
    expect(screen.getByRole("status")).toHaveTextContent("ready")
  })

  it("returns the same result until the state changes", () => {
    const client = createFakeAuthClient()
    const { result, rerender } = renderHook(useAuth, {
      wrapper: withClient(client),
    })
    const first = result.current

    rerender()
    expect(result.current).toBe(first)

    act(() => {
      client.reportUnauthenticated()
      client.connect()
    })
    expect(result.current).not.toBe(first)
    expect(result.current.state.status).toBe("connected")
    expect(result.current.connect).toBe(first.connect)
    expect(result.current.disconnect).toBe(first.disconnect)
    expect(result.current.reportUnauthenticated).toBe(
      first.reportUnauthenticated,
    )
  })

  it("throws outside an AuthProvider", () => {
    expect(() => renderHook(useAuth)).toThrow(/within an AuthProvider/)
  })
})
