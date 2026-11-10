/** The environment variables that say which commit a build is of. */
export interface BuildVersionEnv {
  /** The full commit SHA, set by GitHub Actions. */
  readonly GITHUB_SHA?: string | undefined
}

const SHA = /^[0-9a-f]{7,64}$/i
const SHORT_SHA_LENGTH = 7

/**
 * The version the footer shows. A CI build of a commit is `<package version>+<short
 * commit>`; a local build (no commit in the environment) is `dev`. Blank values count as
 * unset, because GitHub Actions expands an unset variable to "".
 */
export function resolveBuildVersion(
  packageVersion: string,
  env: BuildVersionEnv,
): string {
  const sha = env.GITHUB_SHA?.trim()
  if (!sha) return "dev"
  if (!SHA.test(sha)) {
    throw new Error(`GITHUB_SHA must be a commit SHA, got "${sha}"`)
  }
  return `${packageVersion}+${sha.slice(0, SHORT_SHA_LENGTH).toLowerCase()}`
}
