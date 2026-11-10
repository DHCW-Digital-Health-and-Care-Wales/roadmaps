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
import { removeAuthScopedQueries } from "@/features/auth/auth-scoped-queries"
import {
  createFakeAuthClient,
  type FakeAuthClient,
} from "@/features/auth/testing/fake-auth-client"
import { createInMemoryRoadmapRepository } from "@/features/roadmaps/testing/in-memory-roadmap-repository"
import { createI18n, type Language } from "@/i18n"
import { createQueryClient } from "@/lib/query-client"

export interface RenderWithProvidersOptions {
  /** The initial route, e.g. `/roadmaps/7`. Defaults to `/`. */
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
 * for the outside world: a fake auth client (whose disconnect clears auth-scoped queries,
 * as in production), an in-memory repository and memory history. Resolves once the
 * route has rendered.
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
  const queryClient = createQueryClient()
  const authClient = createFakeAuthClient(authState, {
    onDisconnect: () => {
      removeAuthScopedQueries(queryClient)
    },
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
