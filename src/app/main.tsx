import { RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

// Validates public config on startup so a bad environment fails fast.
import "@/app/config"
import { router } from "@/app/router"
import "@/styles/globals.css"

const rootElement = document.getElementById("root")
if (!rootElement) {
  throw new Error("Root element #root not found in index.html")
}

createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
