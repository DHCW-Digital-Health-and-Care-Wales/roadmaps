import { RouterProvider } from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import { expect, it } from "vitest"

import { router } from "@/app/router"

it("renders the placeholder home page at the root hash route", async () => {
  render(<RouterProvider router={router} />)

  expect(
    await screen.findByRole("heading", { name: "Product Roadmaps" }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole("button", { name: "Connect Google account" }),
  ).toBeDisabled()
  expect(router.state.location.pathname).toBe("/")
})
