import {
  defaultLanguage,
  isLanguage,
  matchLanguage,
  type Language,
} from "./languages"

const storageKey = "roadmaps.language"

type PreferenceStorage = Pick<Storage, "getItem" | "setItem">

export interface LanguagePreferenceOptions {
  /** Defaults to `localStorage`; `null` when storage is unavailable. */
  storage?: PreferenceStorage | null | undefined
  /** Defaults to `navigator.languages`, most preferred first. */
  browserLanguages?: readonly string[] | undefined
}

/**
 * The language to start in (ADR-0008): an explicit stored choice, else the first browser
 * language we support (any `cy-*` gives `cy`), else English.
 */
export function resolveLanguage(
  options: LanguagePreferenceOptions = {},
): Language {
  const {
    storage = getLocalStorage(),
    browserLanguages = navigator.languages,
  } = options
  const stored = readStored(storage)
  if (stored) return stored
  for (const tag of browserLanguages) {
    const language = matchLanguage(tag)
    if (language) return language
  }
  return defaultLanguage
}

/** Remembers an explicit choice. Storage failures are ignored: it is only a preference. */
export function storeLanguagePreference(
  language: Language,
  storage: PreferenceStorage | null = getLocalStorage(),
): void {
  try {
    storage?.setItem(storageKey, language)
  } catch {
    // Storage full, disabled or blocked: the choice still applies to this visit.
  }
}

function readStored(storage: PreferenceStorage | null): Language | undefined {
  try {
    const value = storage?.getItem(storageKey)
    return isLanguage(value) ? value : undefined
  } catch {
    return undefined
  }
}

// Reading `window.localStorage` itself throws when site data is blocked.
function getLocalStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}
