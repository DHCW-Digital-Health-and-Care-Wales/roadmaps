import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { ESLint } from "eslint"
import tseslint from "typescript-eslint"
import { describe, expect, it } from "vitest"

import { designTokenRules } from "./design-token-lint.ts"

/**
 * Each fixture names the path it is linted as (`// @lint-as src/…`), so the blocks'
 * `files` globs apply as they do to app code, and marks each line it expects reported:
 * `// ✗ <part of the message>`. Every unmarked line must lint clean.
 */
const FIXTURES = join(import.meta.dirname, "fixtures", "design-token-lint")
const ROOT = join(import.meta.dirname, "..")

const eslint = new ESLint({
  cwd: ROOT,
  overrideConfigFile: true,
  // The design rules alone, without type information: they need none.
  overrideConfig: [
    {
      files: ["**/*.{ts,tsx}"],
      languageOptions: { parser: tseslint.parser },
    },
    ...designTokenRules,
  ],
})

interface Expectation {
  line: number
  source: string
  message: string | undefined
}

function read(name: string): {
  path: string
  code: string
  expected: Expectation[]
} {
  const code = readFileSync(join(FIXTURES, name), "utf8")
  const path = /^\/\/ @lint-as (\S+)/.exec(code)?.[1]
  if (path === undefined) throw new Error(`${name} has no // @lint-as path`)
  const expected = code.split("\n").map((source, index) => ({
    line: index + 1,
    source: source.trim(),
    message: /^(?!\s*\/\/).*\/\/ ✗ (.+)$/.exec(source)?.[1]?.trim(),
  }))
  return { path, code, expected }
}

async function lint(code: string, path: string) {
  const [result] = await eslint.lintText(code, { filePath: path })
  return result?.messages ?? []
}

const fixtures = readdirSync(FIXTURES).filter((name) => name.endsWith(".tsx"))

describe("design token lint rules (ADR-010)", () => {
  it("has fixtures to prove them", () => {
    expect(fixtures).toEqual(
      expect.arrayContaining(["feature.tsx", "shared-component.tsx"]),
    )
  })

  describe.each(fixtures)("%s", (name) => {
    const { path, code, expected } = read(name)

    it("reports exactly the marked lines, each with its message", async () => {
      const messages = await lint(code, path)
      expect(messages.filter((m) => m.fatal)).toEqual([])
      // Every mismatch at once, so a changed rule shows all it affects.
      const mismatches = expected.flatMap(({ line, source, message }) => {
        const found = messages
          .filter((m) => m.line === line)
          .map((m) => `${m.ruleId ?? ""}: ${m.message}`)
        const ok =
          message === undefined
            ? found.length === 0
            : found.some((m) => m.includes(message))
        return ok ? [] : [{ line, source, expected: message ?? "clean", found }]
      })
      expect(mismatches).toEqual([])
    })
  })

  it("leaves tests alone, which may break the rules on purpose", async () => {
    const { code, path } = read("feature.tsx")
    const messages = await lint(code, path.replace(/\.tsx$/, ".test.tsx"))
    expect(messages).toEqual([])
  })
})
