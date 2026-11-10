interface ViteTypeOptions {
  // Disallow unknown keys on `import.meta.env`.
  strictImportMetaEnv: unknown
}

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_GOOGLE_SPREADSHEET_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
