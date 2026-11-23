import type { Catalogue } from "./catalogue"
import type { Language } from "./languages"
import { cy } from "./locales/cy"
import { en } from "./locales/en"

/** The site's text in one language: the English catalogue's shape. */
export type Strings = Catalogue<typeof en, Language>

/** Both catalogues, bundled (ADR-008); a page reads its own through `useStrings()`. */
export const catalogues: Readonly<Record<Language, Strings>> = { en, cy }
