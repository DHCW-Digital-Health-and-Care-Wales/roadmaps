import {
  createMemoryHistory,
  RouterProvider,
  type RouterHistory,
} from "@tanstack/react-router"
import { act, render, type RenderResult } from "@testing-library/react"

import { AppProviders } from "@/app/providers"
import { createAppRouter } from "@/app/router"
import type { AuthState } from "@/domain/auth/auth-client"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import type { RoadmapRepository } from "@/domain/roadmap/roadmap-repository"
import {
  invalidateAuthScopedQueriesOnSessionEnd,
  removeAuthScopedQueries,
} from "@/features/auth/auth-scoped-queries"
import {
  createFakeAuthClient,
  type FakeAuthClient,
} from "@/features/auth/testing/fake-auth-client"
import { createInMemoryRoadmapRepository } from "@/features/roadmaps/testing/in-memory-roadmap-repository"
import { createI18n, type Language } from "@/i18n"
import { createQueryClient } from "@/lib/query-client"

export interface RenderWithProvidersOptions {
  /** The initial route, e.g. `/roadmaps/producta`. Defaults to `/`. */
  path?: string
  /** Replaces the memory history at `path`, e.g. with `createHashHistory()`. */
  history?: RouterHistory
  /** The fake auth client's starting state. Defaults to `ready` (not connected). */
  authState?: AuthState
  /** Roadmaps in the in-memory repository; ignored when `repository` is given. */
  roadmaps?: readonly Roadmap[]
  repository?: RoadmapRepository
  /** Defaults to English. */
  language?: Language
}

/**
 * Renders the whole app at `path` with the real providers and routes, and test doubles
 * for the outside world: a fake auth client, an in-memory repository and memory history.
 * Resolves once the route has rendered. Wired like `composeApp`: a 401 expires the
 * session, the end of a session marks auth-scoped data stale, and disconnecting removes
 * it. Retries run without delay.
 */
export async function renderWithProviders({
  path = "/",
  history = createMemoryHistory({ initialEntries: [path] }),
  authState,
  roadmaps,
  repository = createInMemoryRoadmapRepository(roadmaps),
  language,
}: RenderWithProvidersOptions = {}): Promise<
  RenderResult & {
    authClient: FakeAuthClient
    queryClient: ReturnType<typeof createQueryClient>
    router: ReturnType<typeof createAppRouter>
    i18n: ReturnType<typeof createI18n>
  }
> {
  const i18n = createI18n({ language })
  // Wired like the composition root: a 401 expires the session, disconnect drops data.
  const queryClient = createQueryClient({
    onUnauthenticated: () => {
      authClient.reportUnauthenticated()
    },
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
  const router = createAppRouter(history)

  await act(() => router.load())
  const result = render(
    <AppProviders
      services={{
        i18n,
        queryClient,
        authClient,
        roadmapRepository: repository,
      }}
    >
      <RouterProvider router={router} />
    </AppProviders>,
  )
  return { ...result, authClient, queryClient, router, i18n }
}
