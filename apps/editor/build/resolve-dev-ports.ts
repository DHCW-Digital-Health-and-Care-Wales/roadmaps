import { readFileSync } from "node:fs"

/** The ports `vite` (dev) and `vite preview` (and so the E2E suite) listen on. */
export interface DevPorts {
  readonly dev: number
  readonly preview: number
}

/** A checkout without `.env.worktree`: the ports the OAuth client lists as origins. */
export const DEFAULT_DEV_PORTS: DevPorts = { dev: 5173, preview: 4173 }

/**
 * This checkout's ports: a parallel worktree's own, from the `.env.worktree` that
 * `scripts/worktree/worktree.sh setup` writes, or the defaults when there is none.
 * Ambient `DEV_PORT`/`PREVIEW_PORT` variables are ignored, so a shell exported from
 * another worktree, or from a slot since released, never moves the ports.
 */
export function resolveDevPorts(worktreeEnvFile: URL): DevPorts {
  let text: string
  try {
    text = readFileSync(worktreeEnvFile, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT")
      return DEFAULT_DEV_PORTS
    throw error
  }
  return parseWorktreePorts(text)
}

/** The ports in an `.env.worktree` file's `DEV_PORT=` and `PREVIEW_PORT=` lines. */
export function parseWorktreePorts(text: string): DevPorts {
  return {
    dev: readPort(text, "DEV_PORT"),
    preview: readPort(text, "PREVIEW_PORT"),
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
