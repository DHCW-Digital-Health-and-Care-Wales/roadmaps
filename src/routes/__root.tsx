import { createRootRoute, Outlet } from "@tanstack/react-router"

import { AppShell } from "@/components/layout/app-shell"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { NotFoundPage } from "@/components/layout/not-found-page"
import { AccountMenu } from "@/features/auth/components/account-menu"
import { AuthNotice } from "@/features/auth/components/auth-notice"
import { ConnectionStatus } from "@/features/auth/components/connection-status"
import { DisconnectQuestion } from "@/features/roadmaps/editing/disconnect-question"
import { useChangedRoadmapCount } from "@/features/roadmaps/editing/pending-changes-context"
import { RoadmapNavigation } from "@/features/roadmaps/navigation/roadmap-navigation"

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
})

function RootLayout() {
  const unpublishedRoadmaps = useChangedRoadmapCount()
  return (
    <>
      <AppShell
        headerActions={
          <>
            <ConnectionStatus />
            <LanguageSwitcher />
            <AccountMenu />
          </>
        }
        navigation={(form) => <RoadmapNavigation form={form} />}
        unpublishedRoadmaps={unpublishedRoadmaps}
      >
        <AuthNotice />
        <Outlet />
      </AppShell>
      {/* In the router, so the roadmaps it names are links. */}
      <DisconnectQuestion />
    </>
  )
}
