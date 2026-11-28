import { ESLint } from "eslint"
import tseslint from "typescript-eslint"
import { describe, expect, it } from "vitest"

import { noFixedPausesInTests } from "../eslint.base.ts"

const eslint = new ESLint({
  cwd: import.meta.dirname,
  overrideConfigFile: true,
  overrideConfig: [
    { files: ["**/*.{ts,tsx}"], languageOptions: { parser: tseslint.parser } },
    noFixedPausesInTests,
  ],
})

async function lint(code: string, filePath = "src/example.test.ts") {
  const [result] = await eslint.lintText(code, { filePath })
  return (result?.messages ?? []).map((message) => message.ruleId)
}

describe("tests/no-fixed-pause", () => {
  it.each([
    ["a timer promise", "await new Promise((r) => setTimeout(r, 50))"],
    ["a timer on window", "window.setTimeout(done, 50)"],
    ["an interval", "setInterval(tick, 50)"],
    ["Playwright's wait", "await page.waitForTimeout(500)"],
    ["an msw delay", "await delay(100)"],
    ["msw's realistic delay", "await delay()"],
    [
      "Node's timer promises",
      'import { setTimeout } from "node:timers/promises"',
    ],
  ])("reports %s", async (_name, code) => {
    expect(await lint(code)).toEqual(["tests/no-fixed-pause"])
  })

  it("leaves msw's delay that never answers, and a faked clock", async () => {
    const code =
      'await delay("infinite")\nawait vi.advanceTimersByTimeAsync(500)'
    expect(await lint(code)).toEqual([])
  })

  it.each([
    "apps/editor/src/features/x.test.tsx",
    "apps/editor/tests/e2e/x.spec.ts",
    "apps/editor/tests/e2e/fixtures/x.ts",
    "apps/public-site/e2e/x.ts",
    "apps/editor/src/features/roadmaps/testing/x.ts",
    "apps/editor/src/test/x.ts",
  ])("covers %s", async (filePath) => {
    expect(await lint("setTimeout(done, 50)", filePath)).toEqual([
      "tests/no-fixed-pause",
    ])
  })

  it("leaves the app's own code alone", async () => {
    expect(
      await lint("setTimeout(done, 50)", "apps/editor/src/lib/x.ts"),
    ).toEqual([])
  })
})
