import { render, type RenderOptions } from "@testing-library/react"
import type { ReactElement } from "react"
import { I18nextProvider } from "react-i18next"

import { createI18n, type Language } from "@/i18n"

export interface RenderWithI18nOptions extends Omit<RenderOptions, "wrapper"> {
  /** Defaults to English. */
  language?: Language | undefined
}

/** Renders `ui` with a fresh, isolated i18n instance, returned as `i18n`. */
export function renderWithI18n(
  ui: ReactElement,
  { language, ...options }: RenderWithI18nOptions = {},
) {
  const i18n = createI18n({ language })
  const result = render(ui, {
    ...options,
    wrapper: ({ children }) => (
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    ),
  })
  return { ...result, i18n }
}
