import { QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import type { i18n } from "i18next"
import type { ReactNode } from "react"
import { I18nextProvider } from "react-i18next"

import { AppInfoProvider, type AppInfo } from "@/components/layout/app-info"
import { ThemeProvider } from "@/components/theme/theme-provider"
import type { AuthClient } from "@/domain/auth/auth-client"
import type { RoadmapRepository } from "@/domain/roadmap/roadmap-repository"
import { AuthProvider } from "@/features/auth/auth-provider"
import { ReconnectDialogProvider } from "@/features/auth/components/reconnect-dialog"
import { SessionWarning } from "@/features/auth/components/session-warning"
import { PendingChangesProvider } from "@/features/roadmaps/editing/pending-changes-provider"
import { RoadmapRepositoryProvider } from "@/features/roadmaps/roadmap-repository-context"
import { WriteHoldProvider } from "@/features/roadmaps/write-hold/write-hold-provider"

/** What the providers need: built by `composeApp()`, or by tests with fakes. */
export interface AppServices {
  readonly i18n: i18n
  readonly queryClient: QueryClient
  readonly authClient: AuthClient
  readonly roadmapRepository: RoadmapRepository
  readonly appInfo: AppInfo
}

export interface AppProvidersProps {
  services: AppServices
  children: ReactNode
}

/**
 * Every app-wide provider, outermost first: i18n (so everything below, the session warning
 * included, is translated), theme, query cache, auth, the dialog that asks to reconnect
 * before an action that needs a session, the roadmap data source, the Product Lead's
 * pending edits (which outlive a session, and decide what Disconnect asks), the hold after
 * a write the app couldn't read back, then the app's own details (version, feedback
 * address). The reconnect dialog, the hold and the session warning are dialogs over
 * whichever page is open.
 */
export function AppProviders({ services, children }: AppProvidersProps) {
  return (
    <I18nextProvider i18n={services.i18n}>
      <ThemeProvider>
        <QueryClientProvider client={services.queryClient}>
          <AuthProvider client={services.authClient}>
            <ReconnectDialogProvider>
              <RoadmapRepositoryProvider
                repository={services.roadmapRepository}
              >
                <PendingChangesProvider>
                  <WriteHoldProvider>
                    <AppInfoProvider info={services.appInfo}>
                      {children}
                    </AppInfoProvider>
                    <SessionWarning />
                  </WriteHoldProvider>
                </PendingChangesProvider>
              </RoadmapRepositoryProvider>
            </ReconnectDialogProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nextProvider>
  )
}
