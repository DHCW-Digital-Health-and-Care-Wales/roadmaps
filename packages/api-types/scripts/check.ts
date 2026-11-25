// `pnpm api-types:check`: fails when src/generated/, or the directory given as an
// argument, differs from what the committed apps/api/openapi.json generates.
import { check } from "./contract.ts"

const drift = await check(process.argv[2])
if (drift.length > 0) {
  console.error(
    `packages/api-types/src/generated differs from what apps/api/openapi.json generates:\n${drift.map((line) => `  ${line}`).join("\n")}\nRun \`pnpm api:contract\` and commit what it writes.`,
  )
  process.exitCode = 1
}
