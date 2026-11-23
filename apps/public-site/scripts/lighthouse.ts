/**
 * Runs Lighthouse CI (lighthouserc.json) against `vite preview` of a build,
 * on this checkout's preview port (scripts/dev-ports.ts), so parallel
 * worktrees don't audit each other's servers. `pnpm lighthouse` builds the
 * example data first.
 */
import { spawnSync } from "node:child_process"
import { resolveDevPorts } from "./dev-ports.ts"

const base = `http://localhost:${String(resolveDevPorts().preview)}/product-roadmaps/`
const pages = ["en/", "cy/producta/"]

const { status, error } = spawnSync(
  "lhci",
  ["autorun", ...pages.map((page) => `--collect.url=${base}${page}`)],
  { stdio: "inherit" },
)
if (error) throw error
process.exit(status ?? 1)
