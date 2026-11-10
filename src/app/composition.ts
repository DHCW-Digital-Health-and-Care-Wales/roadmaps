import { config as defaultConfig, type AppConfig } from "@/app/config"
import { removeAuthScopedQueries } from "@/features/auth/auth-scoped-queries"
import { createI18n, resolveLanguage, syncDocumentLanguage } from "@/i18n"
import { createGoogleAuthClient } from "@/infrastructure/google-identity"
import {
  createSheetsClient,
  GoogleSheetsRoadmapRepository,
  SHEETS_SCOPE,
} from "@/infrastructure/google-sheets"
import { createQueryClient } from "@/lib/query-client"

import type { AppServices } from "./providers"

/**
 * The composition root (ADR-0002): the only place that picks concrete adapters. Swapping
 * Google Sheets for another data source changes this function and nothing else. Call it
 * once at startup, so Google's script starts loading before the first click.
 */
export function composeApp(config: AppConfig = defaultConfig): AppServices {
  const i18n = createI18n({ language: resolveLanguage() })
  syncDocumentLanguage(i18n)

  const queryClient = createQueryClient()
  const authClient = createGoogleAuthClient({
    clientId: config.googleClientId,
    scopes: [SHEETS_SCOPE],
    // Data fetched with the session must not outlive it (ADR-0003).
    onDisconnect: () => {
      removeAuthScopedQueries(queryClient)
    },
  })
  import.meta.hot?.dispose(() => {
    authClient.dispose()
  })

  const roadmapRepository = new GoogleSheetsRoadmapRepository({
    client: createSheetsClient({ getAccessToken: authClient.getAccessToken }),
    spreadsheetId: config.spreadsheetId,
  })

  return { i18n, queryClient, authClient, roadmapRepository }
}
