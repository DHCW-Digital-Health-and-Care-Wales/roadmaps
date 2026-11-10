import { RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { composeApp } from "@/app/composition"
import { AppProviders } from "@/app/providers"
import { createAppRouter } from "@/app/router"
import "@/styles/globals.css"

const rootElement = document.getElementById("root")
if (!rootElement) {
  throw new Error("Root element #root not found in index.html")
}

const services = composeApp()
const router = createAppRouter()

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders services={services}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)
