import { spawnSync } from "node:child_process"
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { check, DOCUMENT, generate, GENERATED } from "./contract.ts"

let scratch: string
/** A copy of the committed generated directory, for a test to change. */
let committed: string

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), "api-types-test-"))
  committed = join(scratch, "committed")
  cpSync(GENERATED, committed, { recursive: true })
})

afterEach(() => {
  rmSync(scratch, { recursive: true, force: true })
})

describe("the generated package's drift check", () => {
  it("passes the committed directory", async () => {
    expect(await check()).toEqual([])
  })

  it.each([
    [
      "a file the generator does not write",
      () => {
        mkdirSync(join(committed, "client"))
        writeFileSync(join(committed, "client", "sdk.gen.ts"), "")
      },
      ["not generated: client/sdk.gen.ts"],
    ],
    [
      "a changed file",
      () => {
        appendFileSync(join(committed, "zod.gen.ts"), "// by hand\n")
      },
      ["changed: zod.gen.ts"],
    ],
    [
      "a removed file",
      () => {
        rmSync(join(committed, "types.gen.ts"))
      },
      ["missing: types.gen.ts"],
    ],
    [
      "a missing directory",
      () => {
        rmSync(committed, { recursive: true })
      },
      ["missing: index.ts", "missing: types.gen.ts", "missing: zod.gen.ts"],
    ],
  ])("fails %s", async (_name, change, drift) => {
    change()

    expect(await check(committed)).toEqual(drift)
  })

  it("fails a document the committed directory was not generated from", async () => {
    const document = join(scratch, "openapi.json")
    const source = readFileSync(DOCUMENT, "utf8")
    expect(source).toContain('"server.internal_error"')
    writeFileSync(
      document,
      source.replace('"server.internal_error"', '"planted.code"'),
    )

    expect(await check(committed, document)).toEqual([
      "changed: types.gen.ts",
      "changed: zod.gen.ts",
    ])
  })

  it.each([
    ["that is not there", undefined],
    ["it cannot parse", "{ not json"],
  ])("rejects, writing nothing, for a document %s", async (_name, source) => {
    const document = join(scratch, "openapi.json")
    if (source !== undefined) writeFileSync(document, source)
    const output = join(scratch, "output")

    await expect(generate(output, document)).rejects.toThrow()
    expect(existsSync(output)).toBe(false)
  })

  /** Runs the check as `pnpm api-types:check` does, on `args`' directory if given. */
  function run(...args: string[]) {
    return spawnSync(process.execPath, ["scripts/check.ts", ...args], {
      cwd: join(import.meta.dirname, ".."),
      encoding: "utf8",
    })
  }

  it("exits 0 for the committed directory, as CI runs it", () => {
    const result = run()

    expect(result.status, result.stderr).toBe(0)
  })

  it("exits 1 on drift, naming the file and the command that mends it", () => {
    rmSync(join(committed, "zod.gen.ts"))

    const result = run(committed)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("missing: zod.gen.ts")
    expect(result.stderr).toContain("pnpm api:contract")
  })
})
