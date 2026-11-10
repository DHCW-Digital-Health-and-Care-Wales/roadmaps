import { z } from "zod/mini"

/** A feedback address is a web page people can leave the app for, so only https. */
function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return (
      url.protocol === "https:" && url.username === "" && url.password === ""
    )
  } catch {
    return false
  }
}

/** Optional: unset or blank means no feedback link. Anything else must be https. */
const feedbackUrlSchema = z.pipe(
  z.pipe(
    z.optional(z.string()),
    z.transform((value) => {
      const trimmed = value?.trim()
      return trimmed === "" ? undefined : trimmed
    }),
  ),
  z.optional(
    z
      .string()
      .check(
        z.refine(isHttpsUrl, "must be an https:// address, or left blank"),
      ),
  ),
)

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
    VITE_FEEDBACK_URL: feedbackUrlSchema,
  }),
  z.transform((env) => ({
    googleClientId: env.VITE_GOOGLE_CLIENT_ID,
    spreadsheetId: env.VITE_GOOGLE_SPREADSHEET_ID,
    /** Where the phase banner's feedback link goes; none when unset. */
    feedbackUrl: env.VITE_FEEDBACK_URL,
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
