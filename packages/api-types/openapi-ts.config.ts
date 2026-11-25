import { defineConfig } from "@hey-api/openapi-ts"

/** How the generator writes, wherever it writes: the drift check's copy included. */
export const OUTPUT = {
  path: "src/generated",
  // Never read from a tsconfig, so a copy generated anywhere comes out the same.
  tsConfigPath: null,
  module: { extension: ".ts" },
} as const

// Types and zod/mini schemas only, never a client or SDK (ADR-017): the editor's own
// adapter makes the requests.
export default defineConfig({
  input: "../../apps/api/openapi.json",
  output: OUTPUT,
  plugins: [
    // Union types, which leave nothing to compile away (`erasableSyntaxOnly`).
    { name: "@hey-api/typescript", enums: false },
    { name: "zod", compatibilityVersion: "mini" },
  ],
})
