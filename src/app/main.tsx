import { RouterProvider } from "@tanstack/react-router"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { I18nextProvider } from "react-i18next"

// Validates public config on startup so a bad environment fails fast.
import "@/app/config"
import { router } from "@/app/router"
import { createI18n, resolveLanguage, syncDocumentLanguage } from "@/i18n"
import "@/styles/globals.css"

// S05 moves these two lines into app/composition.ts and the provider into app/providers.tsx.
const i18n = createI18n({ language: resolveLanguage() })
syncDocumentLanguage(i18n)

const rootElement = document.getElementById("root")
if (!rootElement) {
  throw new Error("Root element #root not found in index.html")
}

createRoot(rootElement).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <RouterProvider router={router} />
    </I18nextProvider>
  </StrictMode>,
)
