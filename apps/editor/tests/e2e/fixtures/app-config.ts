import path from "node:path"

import { loadEnv } from "vite"

/** The public config the production build was made with: `vite build` reads the same files. */
const env = loadEnv(
  "production",
  path.resolve(import.meta.dirname, "../../.."),
  "VITE_",
)

function required(name: string): string {
  const value = env[name]?.trim()
  if (!value) throw new Error(`${name} is missing from .env.production`)
  return value
}

export const appConfig = {
  clientId: required("VITE_GOOGLE_CLIENT_ID"),
  spreadsheetId: required("VITE_GOOGLE_SPREADSHEET_ID"),
} as const

/** The OAuth scope the app must request (ADR-003). */
export const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets"
