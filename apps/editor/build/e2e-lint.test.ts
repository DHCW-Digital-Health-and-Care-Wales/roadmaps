import { join } from "node:path"

import { ESLint } from "eslint"
import tseslint from "typescript-eslint"
import { describe, expect, it } from "vitest"

import { e2eRules } from "./e2e-lint.ts"

const eslint = new ESLint({
  cwd: join(import.meta.dirname, ".."),
  overrideConfigFile: true,
  overrideConfig: [
    {
      files: ["**/*.ts"],
      languageOptions: { parser: tseslint.parser },
    },
    ...e2eRules,
  ],
})

async function lint(code: string, filePath: string) {
  const [result] = await eslint.lintText(code, { filePath })
  return result?.messages ?? []
}

const throttle = `await client.send("Emulation.setCPUThrottlingRate", { rate: 6 })`

describe("e2e lint rules", () => {
  it("reports a test that throttles the CPU", async () => {
    const messages = await lint(throttle, "tests/e2e/press.spec.ts")
    expect(messages.map((m) => m.message)).toEqual([
      expect.stringContaining("Do not slow the CPU in a test"),
    ])
  })

  it.each([
    [
      "a template literal",
      "await client.send(`Emulation.setCPUThrottlingRate`, { rate: 6 })",
    ],
    [
      "a template literal with an expression",
      "await client.send(`${domain}.setCPUThrottlingRate`, { rate: 6 })",
    ],
    [
      "a method name held in a variable",
      `const method = "Emulation.setCPUThrottlingRate"\nawait client.send(method, { rate: 6 })`,
    ],
  ])("reports %s", async (_name, code) => {
    expect(await lint(code, "tests/e2e/press.spec.ts")).toHaveLength(1)
  })

  it("leaves a test that drives a Chrome DevTools command for other reasons", async () => {
    const code = `await client.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [] })`
    expect(await lint(code, "tests/e2e/touch.spec.ts")).toEqual([])
  })

  it("reports a box read by boundingBox() in a spec or a fixture", async () => {
    const code = "const box = await dialog.boundingBox()"
    for (const file of [
      "tests/e2e/press.spec.ts",
      "tests/e2e/fixtures/dialogs.ts",
    ]) {
      expect((await lint(code, file)).map((m) => m.message)).toEqual([
        expect.stringContaining("Read a box with boxOf or boxesOf"),
      ])
    }
  })

  it("leaves boundingBox() to the layout fixture, which still forbids throttling", async () => {
    const file = "tests/e2e/fixtures/layout.ts"
    expect(await lint("const box = await locator.boundingBox()", file)).toEqual(
      [],
    )
    expect(await lint(throttle, file)).toHaveLength(1)
  })

  it("leaves other code alone", async () => {
    expect(await lint(throttle, "src/lib/example.ts")).toEqual([])
  })
})
