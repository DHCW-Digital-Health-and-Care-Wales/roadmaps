import { createRootRoute, Outlet } from "@tanstack/react-router"

import { AppShell } from "@/components/layout/app-shell"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { NotFoundPage } from "@/components/layout/not-found-page"
import { AccountMenu } from "@/features/auth/components/account-menu"
import { AuthNotice } from "@/features/auth/components/auth-notice"
import { ConnectionStatus } from "@/features/auth/components/connection-status"
import { DisconnectQuestion } from "@/features/roadmaps/editing/disconnect-question"
import { useChangedRoadmapCount } from "@/features/roadmaps/editing/pending-changes-context"
import { NavigationSearchBox } from "@/features/roadmaps/navigation/navigation-search"
import { NavigationSearchProvider } from "@/features/roadmaps/navigation/navigation-search-provider"
import { RoadmapNavigation } from "@/features/roadmaps/navigation/roadmap-navigation"

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
})

function RootLayout() {
  const unpublishedRoadmaps = useChangedRoadmapCount()
  return (
    <>
      <NavigationSearchProvider>
        <AppShell
          headerActions={
            <>
              <ConnectionStatus />
              <LanguageSwitcher />
              <AccountMenu />
            </>
          }
          navigation={(form) => <RoadmapNavigation form={form} />}
          navigationSearch={(form, openNavigation) => (
            <NavigationSearchBox
              form={form}
              onOpenNavigation={openNavigation}
            />
          )}
          unpublishedRoadmaps={unpublishedRoadmaps}
        >
          <AuthNotice />
          <Outlet />
        </AppShell>
      </NavigationSearchProvider>
      {/* In the router, so the roadmaps it names are links. */}
      <DisconnectQuestion />
    </>
  )
}
