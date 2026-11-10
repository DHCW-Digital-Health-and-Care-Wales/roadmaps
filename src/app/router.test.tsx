import { RouterProvider } from "@tanstack/react-router"
import { screen } from "@testing-library/react"
import { expect, it } from "vitest"

import { router } from "@/app/router"
import { renderWithI18n } from "@/test/render-with-i18n"

it("renders the placeholder home page at the root hash route", async () => {
  renderWithI18n(<RouterProvider router={router} />)

  expect(
    await screen.findByRole("heading", { name: "Product Roadmaps" }),
  ).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Connect Google" })).toBeDisabled()
  expect(router.state.location.pathname).toBe("/")
})
