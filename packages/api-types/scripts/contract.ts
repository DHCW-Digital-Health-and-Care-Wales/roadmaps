// Generating the package's source from the API's committed OpenAPI document, and
// comparing a generated directory with the committed one.
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join, relative, resolve } from "node:path"

import { createClient } from "@hey-api/openapi-ts"

import config, { OUTPUT } from "../openapi-ts.config.ts"

const PACKAGE_DIR = join(import.meta.dirname, "..")

/** The committed document the package is generated from, and where it is committed. */
export const DOCUMENT = resolve(PACKAGE_DIR, "../../apps/api/openapi.json")
export const GENERATED = join(PACKAGE_DIR, "src/generated")

/** Writes the types and schemas of `input` into `output`, emptying it first. */
export async function generate(
  output: string = GENERATED,
  input: string = DOCUMENT,
): Promise<void> {
  const jobs = await createClient({
    ...(await config),
    input,
    output: { ...OUTPUT, path: output },
    logs: { file: false },
  })
  // The generator reports an input it cannot read, then answers with no job.
  if (jobs.length === 0) {
    throw new Error(`@hey-api/openapi-ts generated nothing from ${input}`)
  }
}

/** Every file under `directory`, by its path from it; none if it is missing. */
function files(directory: string): Set<string> {
  if (!existsSync(directory)) return new Set()
  const entries = readdirSync(directory, {
    recursive: true,
    withFileTypes: true,
  })
  return new Set(
    entries
      .filter((entry) => !entry.isDirectory())
      .map((entry) => relative(directory, join(entry.parentPath, entry.name))),
  )
}

/**
 * Each way the `committed` directory differs from the `expected` one, file by file:
 * `git diff` alone would pass a file the generator now writes that was never added.
 */
function differences(committed: string, expected: string): string[] {
  const found = files(committed)
  const wanted = files(expected)
  return [...new Set([...found, ...wanted])].sort().flatMap((path) => {
    if (!found.has(path)) return [`missing: ${path}`]
    if (!wanted.has(path)) return [`not generated: ${path}`]
    const same = readFileSync(join(committed, path)).equals(
      readFileSync(join(expected, path)),
    )
    return same ? [] : [`changed: ${path}`]
  })
}

/** How the `committed` directory differs from what the `input` document generates. */
export async function check(
  committed: string = GENERATED,
  input: string = DOCUMENT,
): Promise<string[]> {
  const scratch = mkdtempSync(join(tmpdir(), "api-types-"))
  try {
    const expected = join(scratch, "generated")
    await generate(expected, input)
    return differences(committed, expected)
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}
