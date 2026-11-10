/** The environment variables that decide where the app is served (ADR-0007). */
export interface BasePathEnv {
  /** Explicit override, e.g. `/preview/`. Wins over everything else. */
  readonly VITE_BASE_PATH?: string | undefined
  /** Custom Pages domain (the `PAGES_CUSTOM_DOMAIN` repository variable): served at `/`. */
  readonly PAGES_CUSTOM_DOMAIN?: string | undefined
  /** `owner/repo`, set by GitHub Actions. */
  readonly GITHUB_REPOSITORY?: string | undefined
}

const SAFE_PATH = /^[\w.~-]+(?:\/[\w.~-]+)*$/

/**
 * Vite's `base` for this build, always with leading and trailing slashes. In order:
 * `VITE_BASE_PATH`; `/` for a custom domain; `/` for a user/organisation site
 * (`owner/owner.github.io`) or `/<repo>/` for a project site; otherwise `/`.
 * Blank values count as unset, because GitHub Actions expands an unset variable to "".
 */
export function resolveBasePath(env: BasePathEnv): string {
  const override = env.VITE_BASE_PATH?.trim()
  if (override) return normalise(override)

  if (env.PAGES_CUSTOM_DOMAIN?.trim()) return "/"

  const repository = env.GITHUB_REPOSITORY?.trim()
  if (repository) {
    const [owner, repo, ...rest] = repository.split("/")
    if (!owner || !repo || rest.length > 0) {
      throw new Error(
        `GITHUB_REPOSITORY must look like "owner/repo", got "${repository}"`,
      )
    }
    // Pages host names are lower case, so the user-site repo matches case-insensitively.
    const isUserSite = repo.toLowerCase() === `${owner.toLowerCase()}.github.io`
    return isUserSite ? "/" : normalise(repo)
  }

  return "/"
}

function normalise(path: string): string {
  const segments = path.replace(/^\/+|\/+$/g, "")
  if (segments === "") return "/"
  if (
    !SAFE_PATH.test(segments) ||
    segments.split("/").some((s) => s === "." || s === "..")
  ) {
    throw new Error(`Unsupported base path "${path}"`)
  }
  return `/${segments}/`
}
