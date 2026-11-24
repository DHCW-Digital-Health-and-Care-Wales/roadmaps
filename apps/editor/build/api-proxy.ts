import type { ProxyOptions } from "vite"

import {
  API_PORT,
  resolveServicePort,
} from "../../../scripts/worktree/dev-ports.ts"

/**
 * The dev server's proxy of `/api` to this checkout's API (`pnpm api:dev`), so the
 * browser sees the editor and the API on one origin (ADR-020). `changeOrigin` sends the
 * API's own host, which its Host allow-list names.
 */
export function apiProxy(): Record<string, ProxyOptions> {
  const port = resolveServicePort(API_PORT)
  return {
    "/api": { target: `http://127.0.0.1:${String(port)}`, changeOrigin: true },
  }
}
