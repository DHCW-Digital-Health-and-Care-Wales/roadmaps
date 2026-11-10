import { createContext, use, type ReactNode } from "react"

/** What the shell shows about the app itself, decided by the composition root. */
export interface AppInfo {
  /** The footer's version: the package version and commit of a CI build, or `dev`. */
  readonly version: string
  /** Where the phase banner's feedback link goes (https); no link when unset. */
  readonly feedbackUrl?: string | undefined
}

const AppInfoContext = createContext<AppInfo | null>(null)

export interface AppInfoProviderProps {
  info: AppInfo
  children: ReactNode
}

export function AppInfoProvider({ info, children }: AppInfoProviderProps) {
  return <AppInfoContext value={info}>{children}</AppInfoContext>
}

// eslint-disable-next-line react-refresh/only-export-components -- context and its hook belong together
export function useAppInfo(): AppInfo {
  const info = use(AppInfoContext)
  if (!info)
    throw new Error("useAppInfo must be used within an AppInfoProvider")
  return info
}
