import { QueryClientProvider, type QueryClient } from "@tanstack/react-query"
import type { i18n } from "i18next"
import type { ReactNode } from "react"
import { I18nextProvider, useTranslation } from "react-i18next"

import { ThemeProvider } from "@/components/theme/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import type { AuthClient } from "@/domain/auth/auth-client"
import type { RoadmapRepository } from "@/domain/roadmap/roadmap-repository"
import { AuthProvider } from "@/features/auth/auth-provider"
import { AuthNotifications } from "@/features/auth/components/auth-notifications"
import { RoadmapRepositoryProvider } from "@/features/roadmaps/roadmap-repository-context"

/** What the providers need: built by `composeApp()`, or by tests with fakes. */
export interface AppServices {
  readonly i18n: i18n
  readonly queryClient: QueryClient
  readonly authClient: AuthClient
  readonly roadmapRepository: RoadmapRepository
}

export interface AppProvidersProps {
  services: AppServices
  children: ReactNode
}

/**
 * Every app-wide provider, outermost first: i18n (so everything below, toasts included,
 * is translated), theme, query cache, auth, then the roadmap data source.
 */
export function AppProviders({ services, children }: AppProvidersProps) {
  return (
    <I18nextProvider i18n={services.i18n}>
      <ThemeProvider>
        <QueryClientProvider client={services.queryClient}>
          <AuthProvider client={services.authClient}>
            <RoadmapRepositoryProvider repository={services.roadmapRepository}>
              {children}
              <AuthNotifications />
              <Notifications />
            </RoadmapRepositoryProvider>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </I18nextProvider>
  )
}

function Notifications() {
  const { t } = useTranslation()
  return <Toaster containerAriaLabel={t("layout.notifications")} />
}
