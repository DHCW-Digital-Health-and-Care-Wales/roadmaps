import { createRootRoute, Outlet } from "@tanstack/react-router"

import { AppShell } from "@/components/layout/app-shell"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { NotFoundPage } from "@/components/layout/not-found-page"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { AuthNotice } from "@/features/auth/components/auth-notice"
import { ConnectionStatus } from "@/features/auth/components/connection-status"
import { HeaderAuthButton } from "@/features/auth/components/header-auth-button"

export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFoundPage,
})

function RootLayout() {
  return (
    <AppShell
      headerActions={
        <>
          <ConnectionStatus />
          <LanguageSwitcher />
          <ThemeToggle />
          <HeaderAuthButton />
        </>
      }
    >
      <AuthNotice />
      <Outlet />
    </AppShell>
  )
}
