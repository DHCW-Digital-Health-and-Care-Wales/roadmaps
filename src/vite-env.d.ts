interface ViteTypeOptions {
  // Disallow unknown keys on `import.meta.env`.
  strictImportMetaEnv: unknown
}

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_GOOGLE_SPREADSHEET_ID: string
  /** Optional https address for the phase banner's feedback link. */
  readonly VITE_FEEDBACK_URL?: string
}

/** The footer's version: set at build time by `build/resolve-build-version.ts`. */
declare const __APP_VERSION__: string

interface ImportMeta {
  readonly env: ImportMetaEnv
}
