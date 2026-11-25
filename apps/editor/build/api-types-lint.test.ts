import { readdirSync } from "node:fs"
import { join } from "node:path"

import { ESLint } from "eslint"
import { describe, expect, it } from "vitest"

const EDITOR = join(import.meta.dirname, "..")
const BOUNDARY_RULES = new Set([
  "no-restricted-imports",
  "api-types/no-deferred-import",
])

/**
 * The editor's own config, running the two rules that hold the boundary. Neither reads
 * types, and the parser's project service fails when one file is linted again with new
 * text, so it is off.
 */
const eslint = new ESLint({
  cwd: EDITOR,
  ruleFilter: ({ ruleId }) => BOUNDARY_RULES.has(ruleId),
  overrideConfig: {
    languageOptions: { parserOptions: { projectService: false } },
  },
})

/** The rules that report `code`, linted as the existing file `filePath` would hold it. */
async function reports(code: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, { filePath })
  return (result?.messages ?? []).map(
    ({ ruleId, message }) => ruleId ?? message,
  )
}

/**
 * A file of every folder under `src/` but `infrastructure/`, and one at its root. Each
 * layer's block sets `no-restricted-imports` anew, so each is tried.
 */
const OUTSIDE = [
  "src/app/main.tsx",
  "src/assets",
  "src/components/theme/theme-preference.ts",
  "src/domain/roadmap/roadmap.ts",
  "src/features/auth/use-session-warning.ts",
  "src/i18n/index.ts",
  "src/lib/errors.ts",
  "src/routes/__root.tsx",
  "src/styles/tokens.test.ts",
  "src/test/setup.ts",
  "src/vite-env.d.ts",
]

/** Folders with no TypeScript to lint. */
const WITHOUT_TYPESCRIPT = new Set(["src/assets"])
const FILES = OUTSIDE.filter((path) => !WITHOUT_TYPESCRIPT.has(path))

const STATIC = [
  `import { zErrorResponse } from "@roadmaps/api-types"`,
  `import type { ErrorCode } from "@roadmaps/api-types"`,
  `import { zErrorCode } from "@roadmaps/api-types/src/generated/zod.gen.ts"`,
  `export * from "@roadmaps/api-types"`,
  `export { zErrorCode } from "../../../../packages/api-types/src/index.ts"`,
  `import type { ErrorCode } from "../../../packages/api-types"`,
  `import schemas from "../../../node_modules/@roadmaps/api-types/src/index.ts"`,
]

const DEFERRED = [
  `export const load = () => import("@roadmaps/api-types")`,
  "export const load = () => import(`@roadmaps/api-types`)",
  `export const load = () => import("../../../../packages/api-types/src/index.ts")`,
  "export const load = (name: string) => import(`@roadmaps/api-types/${name}`)",
  `export type Code = import("@roadmaps/api-types").ErrorCode`,
  `export type Schemas = typeof import("../../../../packages/api-types/src/index.ts")`,
]

describe("only src/infrastructure/ may import the API's generated package", () => {
  it("is tried in every folder under src/ but infrastructure/", () => {
    const folders = readdirSync(join(EDITOR, "src"), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `src/${entry.name}`)
      .filter((folder) => folder !== "src/infrastructure")

    for (const folder of folders) {
      expect(
        OUTSIDE.some((path) => `${path}/`.startsWith(`${folder}/`)),
        `Add a file of ${folder} to OUTSIDE.`,
      ).toBe(true)
    }
  })

  it.each(FILES)("rejects every static import of it in %s", async (file) => {
    for (const code of STATIC) {
      expect(await reports(code, file), code).toEqual(["no-restricted-imports"])
    }
  })

  it.each(FILES)("rejects every deferred import of it in %s", async (file) => {
    for (const code of DEFERRED) {
      expect(await reports(code, file), code).toEqual([
        "api-types/no-deferred-import",
      ])
    }
  })

  it.each([
    "src/infrastructure/roadmaps-api/api-error.ts",
    "src/infrastructure/roadmaps-api/api-error.test.ts",
  ])("allows it in %s", async (file) => {
    for (const code of [...STATIC, ...DEFERRED]) {
      expect(await reports(code, file), code).toEqual([])
    }
  })

  it("leaves other imports alone", async () => {
    const code = [
      `import { AppError } from "@/lib/errors"`,
      `export const load = () => import("./roadmap-item")`,
      `export type Item = import("./roadmap-item").RoadmapItem`,
      `export const error = AppError`,
    ].join("\n")

    expect(await reports(code, "src/domain/roadmap/roadmap.ts")).toEqual([])
  })
})
