import {
  invalidateAuthScopedQueriesOnSessionEnd,
  removeAuthScopedQueries,
} from "@/features/auth/auth-scoped-queries"
import { createI18n, resolveLanguage, syncDocumentLanguage } from "@/i18n"
import { createGoogleAuthClient } from "@/infrastructure/google-identity"
import {
  createSheetsClient,
  GoogleSheetsRoadmapRepository,
  SHEETS_SCOPE,
} from "@/infrastructure/google-sheets"
import { createQueryClient } from "@/lib/query-client"

import { config as defaultConfig, type AppConfig } from "./config"
import type { AppServices } from "./providers"

/**
 * The composition root (ADR-002): the only place that picks concrete adapters. Swapping
 * Google Sheets for another data source changes this function and nothing else. Call it
 * once at startup, so Google's script starts loading before the first click.
 */
export function composeApp(config: AppConfig = defaultConfig): AppServices {
  const i18n = createI18n({ language: resolveLanguage() })
  syncDocumentLanguage(i18n)

  const queryClient = createQueryClient({
    // A rejected token expires the session (ADR-003). `authClient` is assigned below,
    // before any query can run.
    onUnauthenticated: () => {
      authClient.reportUnauthenticated()
    },
  })
  const authClient = createGoogleAuthClient({
    clientId: config.googleClientId,
    scopes: [SHEETS_SCOPE],
    // Data fetched with the session must not outlive it (ADR-003).
    onDisconnect: () => {
      removeAuthScopedQueries(queryClient)
    },
  })
  invalidateAuthScopedQueriesOnSessionEnd(authClient, queryClient)
  import.meta.hot?.dispose(() => {
    authClient.dispose()
  })

  const roadmapRepository = new GoogleSheetsRoadmapRepository({
    client: createSheetsClient({ getAccessToken: authClient.getAccessToken }),
    spreadsheetId: config.spreadsheetId,
  })

  const appInfo = {
    version: __APP_VERSION__,
    feedbackUrl: config.feedbackUrl,
  }

  return { i18n, queryClient, authClient, roadmapRepository, appInfo }
}
