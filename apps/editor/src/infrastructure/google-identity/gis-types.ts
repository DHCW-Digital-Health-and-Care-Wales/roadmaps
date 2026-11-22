/// <reference types="google.accounts" />

// Google Identity Services types. Only this folder may use the `google` global (ADR-003).

/** The part of `google.accounts.oauth2` this adapter uses. */
export type GoogleOAuth2 = Pick<
  typeof google.accounts.oauth2,
  "initTokenClient" | "hasGrantedAllScopes" | "revoke"
>
export type TokenClient = google.accounts.oauth2.TokenClient
export type TokenClientConfig = google.accounts.oauth2.TokenClientConfig
export type OverridableTokenClientConfig =
  google.accounts.oauth2.OverridableTokenClientConfig
/** As typed by `@types/google.accounts`. Treat it as untrusted: see `token-response.ts`. */
export type TokenResponse = google.accounts.oauth2.TokenResponse
export type ClientConfigError = google.accounts.oauth2.ClientConfigError
