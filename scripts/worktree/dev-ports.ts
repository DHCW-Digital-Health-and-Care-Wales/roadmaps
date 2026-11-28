import { readFileSync } from "node:fs"

/** The ports an app's dev server and `vite preview` (and so its E2E suite) listen on. */
export interface DevPorts {
  readonly dev: number
  readonly preview: number
}

/** The `.env.worktree` variables one app reads its ports from, and its ports without the file. */
export interface AppPorts {
  readonly devVariable: string
  readonly previewVariable: string
  readonly defaults: DevPorts
}

/**
 * The editor's; its defaults are the origins the OAuth client lists.
 * `apps/api/scripts/api.sh` also uses the 5173 fallback for `ROADMAPS_EDITOR_ORIGIN`.
 */
export const EDITOR_PORTS: AppPorts = {
  devVariable: "DEV_PORT",
  previewVariable: "PREVIEW_PORT",
  defaults: { dev: 5173, preview: 4173 },
}

/** The public site's ports, beside the editor's. */
export const PUBLIC_SITE_PORTS: AppPorts = {
  devVariable: "SITE_DEV_PORT",
  previewVariable: "SITE_PREVIEW_PORT",
  defaults: { dev: 5174, preview: 4174 },
}

/** A service's one port, such as the API's, and the port it takes without the file. */
export interface ServicePort {
  readonly variable: string
  readonly default: number
}

/**
 * The API's, which the editor's dev server proxies `/api` to; 8000 is
 * apps/api/scripts/api.sh's fallback too.
 */
export const API_PORT: ServicePort = { variable: "API_PORT", default: 8000 }

const WORKTREE_ENV = new URL("../../.env.worktree", import.meta.url)

/**
 * An app's ports in this checkout: a parallel worktree's own, from the
 * `.env.worktree` that `worktree.sh setup` writes at the repository's root, or the
 * app's defaults when there is none. Ambient variables are ignored, so a shell
 * exported from another worktree, or from a slot since released, never moves the
 * ports.
 */
export function resolveDevPorts(
  app: AppPorts,
  worktreeEnvFile: URL = WORKTREE_ENV,
): DevPorts {
  const text = readWorktreeEnv(worktreeEnvFile)
  if (text === undefined) return app.defaults
  return {
    dev: readPort(text, app.devVariable),
    preview: readPort(text, app.previewVariable),
  }
}

/** A service's port in this checkout, read as `resolveDevPorts` reads an app's. */
export function resolveServicePort(
  service: ServicePort,
  worktreeEnvFile: URL = WORKTREE_ENV,
): number {
  const text = readWorktreeEnv(worktreeEnvFile)
  return text === undefined ? service.default : readPort(text, service.variable)
}

function readWorktreeEnv(worktreeEnvFile: URL): string | undefined {
  try {
    return readFileSync(worktreeEnvFile, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined
    throw error
  }
}

function readPort(text: string, name: string): number {
  const value = new RegExp(`^${name}=(\\d+)\\s*$`, "m").exec(text)?.[1]
  const port = Number(value)
  if (
    value === undefined ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535
  ) {
    throw new Error(
      `.env.worktree has no valid ${name}; rerun pnpm worktree:setup to rewrite it`,
    )
  }
  return port
}
