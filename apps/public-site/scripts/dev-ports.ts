/**
 * The ports the dev server and `vite preview` (and so the E2E suite and
 * Lighthouse) listen on. A parallel worktree has its own, in the .env.worktree
 * that the workspace's `pnpm worktree:setup` writes at the repository's root;
 * without that file they are 5174 and 4174, beside the editor's 5173 and 4173.
 */
import { readFileSync } from "node:fs"

export interface DevPorts {
  dev: number
  preview: number
}

export const DEFAULT_DEV_PORTS: DevPorts = { dev: 5174, preview: 4174 }

const WORKTREE_ENV = new URL("../../../.env.worktree", import.meta.url)

/**
 * This checkout's ports. Ambient variables are ignored, so a shell exported
 * from another worktree never moves them.
 */
export function resolveDevPorts(file: URL = WORKTREE_ENV): DevPorts {
  let text: string
  try {
    text = readFileSync(file, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return DEFAULT_DEV_PORTS
    }
    throw error
  }
  return {
    dev: readPort(text, "SITE_DEV_PORT"),
    preview: readPort(text, "SITE_PREVIEW_PORT"),
  }
}

function readPort(text: string, name: string): number {
  const value = new RegExp(`^${name}=(\\d+)\\s*$`, "m").exec(text)?.[1]
  const port = Number(value)
  if (!value || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `.env.worktree has no valid ${name}; rerun pnpm worktree:setup to rewrite it`,
    )
  }
  return port
}
