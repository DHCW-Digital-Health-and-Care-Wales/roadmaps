import { z } from "zod/mini"

import type { AuthFailureCode } from "@/domain/auth/auth-client"

import type { GoogleOAuth2, TokenResponse } from "./gis-types"

// The token response is untrusted: GIS documents `expires_in` without a type (it is a
// number at runtime, a string in `@types/google.accounts`), and fields go missing on error.
const tokenErrorSchema = z.object({ error: z.string().check(z.minLength(1)) })
const tokenGrantSchema = z.object({
  access_token: z.string().check(z.minLength(1)),
  expires_in: z.coerce.number().check(z.positive()),
})

export interface TokenGrant {
  readonly accessToken: string
  readonly lifetimeMs: number
}

/** Turns a GIS token response into a usable grant, or the reason it is not one. */
export function readTokenResponse(
  oauth2: GoogleOAuth2,
  response: TokenResponse,
  scopes: readonly [string, ...string[]],
): TokenGrant | AuthFailureCode {
  const oauthError = tokenErrorSchema.safeParse(response)
  if (oauthError.success) {
    return oauthError.data.error === "access_denied"
      ? "access-denied"
      : "unknown"
  }

  const grant = tokenGrantSchema.safeParse(response)
  if (!grant.success) return "unknown"

  // With granular consent the user may untick a scope and still get a token.
  if (!oauth2.hasGrantedAllScopes(response, ...scopes)) {
    return "scope-not-granted"
  }

  return {
    accessToken: grant.data.access_token,
    lifetimeMs: grant.data.expires_in * 1000,
  }
}
