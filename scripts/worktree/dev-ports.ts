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

/** The editor's; its defaults are the origins the OAuth client lists. */
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
  let text: string
  try {
    text = readFileSync(worktreeEnvFile, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return app.defaults
    throw error
  }
  return {
    dev: readPort(text, app.devVariable),
    preview: readPort(text, app.previewVariable),
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
