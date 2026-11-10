import "i18next"

import type { en } from "./locales/en"

// Types `t()` keys, plural options and interpolation variables from the English catalogue.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation"
    resources: { translation: typeof en }
  }
}
