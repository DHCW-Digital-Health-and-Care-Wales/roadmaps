import {
  createMemoryHistory,
  RouterProvider,
  type RouterHistory,
} from "@tanstack/react-router"
import {
  act,
  render,
  renderHook,
  type RenderHookResult,
  type RenderResult,
} from "@testing-library/react"
import type { ReactNode } from "react"

import { AppProviders, type AppServices } from "@/app/providers"
import { createAppRouter } from "@/app/router"
import type { AppInfo } from "@/components/layout/app-info"
import type { AuthState } from "@/domain/auth/auth-client"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { RoadmapRepository } from "@/domain/roadmap/roadmap-repository"
import {
  currentAuthSession,
  invalidateAuthScopedQueriesOnSessionEnd,
  removeAuthScopedQueries,
} from "@/features/auth/auth-scoped-queries"
import {
  createFakeAuthClient,
  type FakeAuthClient,
} from "@/features/auth/testing/fake-auth-client"
import {
  createInMemoryRoadmapRepository,
  type InMemoryRoadmapItems,
} from "@/features/roadmaps/testing/in-memory-roadmap-repository"
import { createI18n, type Language } from "@/i18n"
import { createQueryClient } from "@/lib/query-client"

export interface TestServicesOptions {
  /** The fake auth client's starting state. Defaults to `ready` (not connected). */
  authState?: AuthState
  /** Roadmaps in the in-memory repository; ignored when `repository` is given. */
  roadmaps?: readonly Roadmap[]
  /** Their items, by roadmap id; ignored when `repository` is given. */
  roadmapItems?: InMemoryRoadmapItems
  repository?: RoadmapRepository
  /** The shell's version and feedback address. Defaults to version `test`, no address. */
  appInfo?: AppInfo
  /** Defaults to English. */
  language?: Language
}

export interface RenderWithProvidersOptions extends TestServicesOptions {
  /** The initial route, e.g. `/roadmaps/producta`. Defaults to `/`. */
  path?: string
  /** Replaces the memory history at `path`, e.g. with `createHashHistory()`. */
  history?: RouterHistory
}

/** The services a test renders with, and handles on the doubles among them. */
interface TestServices {
  services: AppServices
  authClient: FakeAuthClient
  queryClient: ReturnType<typeof createQueryClient>
  i18n: ReturnType<typeof createI18n>
}

/**
 * The app's services with test doubles for the outside world: a fake auth client and an
 * in-memory repository. Wired like `composeApp`: a 401 expires the session, the end of a
 * session marks auth-scoped data stale, and disconnecting removes it. Retries run
 * without delay.
 */
function createTestServices({
  authState,
  roadmaps,
  roadmapItems,
  repository = createInMemoryRoadmapRepository(roadmaps, roadmapItems),
  appInfo = { version: "test" },
  language,
}: TestServicesOptions): TestServices {
  const i18n = createI18n({ language })
  // Wired like the composition root: a 401 expires the session, disconnect drops data.
  const queryClient = createQueryClient({
    onUnauthenticated: () => {
      authClient.reportUnauthenticated()
    },
    currentSession: () => currentAuthSession(authClient),
  })
  const authClient = createFakeAuthClient(authState, {
    onDisconnect: () => {
      removeAuthScopedQueries(queryClient)
    },
  })
  invalidateAuthScopedQueriesOnSessionEnd(authClient, queryClient)
  // Keep retry semantics, without waiting for the back-off.
  queryClient.setDefaultOptions({
    queries: { ...queryClient.getDefaultOptions().queries, retryDelay: 0 },
  })
  return {
    services: {
      i18n,
      queryClient,
      authClient,
      roadmapRepository: repository,
      appInfo,
    },
    authClient,
    queryClient,
    i18n,
  }
}

/**
 * Renders the whole app at `path` with the real providers and routes, and the test
 * services (`createTestServices`) and memory history. Resolves once the route has
 * rendered.
 */
export async function renderWithProviders({
  path = "/",
  history = createMemoryHistory({ initialEntries: [path] }),
  ...options
}: RenderWithProvidersOptions = {}): Promise<
  RenderResult &
    Omit<TestServices, "services"> & {
      router: ReturnType<typeof createAppRouter>
    }
> {
  const { services, ...doubles } = createTestServices(options)
  const router = createAppRouter(history)

  await act(() => router.load())
  const result = render(
    <AppProviders services={services}>
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return { ...result, ...doubles, router }
}

/** Renders a hook inside the real providers, with the test services and no router. */
export function renderHookWithProviders<Result>(
  hook: () => Result,
  options: TestServicesOptions = {},
): RenderHookResult<Result, unknown> & Omit<TestServices, "services"> {
  const { services, ...doubles } = createTestServices(options)
  const result = renderHook(hook, {
    wrapper: ({ children }: { children: ReactNode }) => (
      <AppProviders services={services}>{children}</AppProviders>
    ),
  })
  return { ...result, ...doubles }
}
