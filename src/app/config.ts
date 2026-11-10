import { z } from "zod/mini"

const envSchema = z.pipe(
  z.object({
    VITE_GOOGLE_CLIENT_ID: z
      .string("is required")
      .check(
        z.trim(),
        z.regex(
          /^[\w-]+\.apps\.googleusercontent\.com$/,
          "must be a Google OAuth client ID ending in .apps.googleusercontent.com",
        ),
      ),
    VITE_GOOGLE_SPREADSHEET_ID: z
      .string("is required")
      .check(z.trim(), z.regex(/^[\w-]+$/, "must be a Google spreadsheet ID")),
  }),
  z.transform((env) => ({
    googleClientId: env.VITE_GOOGLE_CLIENT_ID,
    spreadsheetId: env.VITE_GOOGLE_SPREADSHEET_ID,
  })),
)

export type AppConfig = Readonly<z.output<typeof envSchema>>

/** Validates raw environment variables and returns a frozen config, or throws. */
export function parseConfig(env: unknown): AppConfig {
  const result = envSchema.safeParse(env)
  if (!result.success) {
    throw new Error(
      `Invalid app configuration (see .env.example):\n${z.prettifyError(result.error)}`,
    )
  }
  return Object.freeze(result.data)
}

export const config: AppConfig = parseConfig(import.meta.env)
