import {
  defaultLanguage,
  isLanguage,
  matchLanguage,
  type Language,
} from "./languages"

/** Same-site storage key for remembering the choice without cookies. */
const storageKey = "dhcw-product-roadmaps-lang"

type PreferenceStorage = Pick<Storage, "getItem" | "setItem">

export interface LanguagePreferenceOptions {
  /** Defaults to `localStorage`; `null` when storage is unavailable. */
  storage?: PreferenceStorage | null | undefined
  /** Defaults to `navigator.languages`. */
  browserLanguages?: readonly string[] | undefined
}

/**
 * The language to send a visitor at the site root to: the stored choice, else Welsh
 * when any browser language is Welsh (`cy` or `cy-*`), else the default (STY-096 D7).
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
  return browserLanguages.some((tag) => matchLanguage(tag) === "cy")
    ? "cy"
    : defaultLanguage
}

/** Remembers a language chosen with the toggle. Storage failures are ignored: the URL has it. */
export function storeLanguagePreference(
  language: Language,
  storage: PreferenceStorage | null = getLocalStorage(),
): void {
  try {
    storage?.setItem(storageKey, language)
  } catch {
    // Storage full, disabled or blocked (private mode): the choice still applies to this visit.
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
