import { describe, expect, it } from "vitest"

import { parseConfig } from "@/app/config"

const validEnv = {
  VITE_GOOGLE_CLIENT_ID: "123-abc.apps.googleusercontent.com",
  VITE_GOOGLE_SPREADSHEET_ID: "1wuk_pK1LpfLKmdbg6WsY_qKeBC5lcN4rlsjqkAxtflw",
}

describe("parseConfig", () => {
  it("maps valid environment variables to a frozen config", () => {
    const config = parseConfig({ ...validEnv, MODE: "production" })

    expect(config).toEqual({
      googleClientId: validEnv.VITE_GOOGLE_CLIENT_ID,
      spreadsheetId: validEnv.VITE_GOOGLE_SPREADSHEET_ID,
    })
    expect(Object.isFrozen(config)).toBe(true)
  })

  it("trims surrounding whitespace", () => {
    const config = parseConfig({
      VITE_GOOGLE_CLIENT_ID: ` ${validEnv.VITE_GOOGLE_CLIENT_ID}\n`,
      VITE_GOOGLE_SPREADSHEET_ID: ` ${validEnv.VITE_GOOGLE_SPREADSHEET_ID} `,
    })

    expect(config.googleClientId).toBe(validEnv.VITE_GOOGLE_CLIENT_ID)
    expect(config.spreadsheetId).toBe(validEnv.VITE_GOOGLE_SPREADSHEET_ID)
  })

  it("names every missing variable in the error", () => {
    expect(() => parseConfig({})).toThrow(
      /VITE_GOOGLE_CLIENT_ID[\s\S]*VITE_GOOGLE_SPREADSHEET_ID/,
    )
  })

  it.each([
    ["VITE_GOOGLE_CLIENT_ID", "not-a-client-id"],
    ["VITE_GOOGLE_SPREADSHEET_ID", "has spaces/and slashes"],
    ["VITE_GOOGLE_SPREADSHEET_ID", ""],
  ])("rejects an invalid %s", (key, value) => {
    expect(() => parseConfig({ ...validEnv, [key]: value })).toThrow(
      new RegExp(`Invalid app configuration[\\s\\S]*${key}`),
    )
  })
})

describe("parseConfig, feedback address", () => {
  it("is optional: unset or blank means no link", () => {
    expect(parseConfig(validEnv).feedbackUrl).toBeUndefined()
    expect(
      parseConfig({ ...validEnv, VITE_FEEDBACK_URL: "  " }).feedbackUrl,
    ).toBeUndefined()
  })

  it("accepts an https address, trimmed", () => {
    expect(
      parseConfig({
        ...validEnv,
        VITE_FEEDBACK_URL: " https://forms.example.org/roadmaps?src=app ",
      }).feedbackUrl,
    ).toBe("https://forms.example.org/roadmaps?src=app")
  })

  it.each([
    "http://example.org/feedback",
    "mailto:team@example.org",
    "javascript:alert(1)",
    "//example.org/feedback",
    "example.org/feedback",
    "https://user:secret@example.org/feedback",
    "not a url",
  ])("rejects %s, which is not an https address", (value) => {
    expect(() =>
      parseConfig({ ...validEnv, VITE_FEEDBACK_URL: value }),
    ).toThrow(/Invalid app configuration[\s\S]*VITE_FEEDBACK_URL/)
  })
})
