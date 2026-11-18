import { useTranslation } from "react-i18next"

import { useAuth } from "../use-auth"

/**
 * A live region naming the connection state, visible to no one: a Product Lead sees the
 * connection only when it needs action (STY-056 D3), but a screen reader is still told
 * when it changes. It never names the user: a token proves access, not identity
 * (ADR-003).
 */
export function ConnectionStatus() {
  const { t } = useTranslation()
  const { status } = useAuth().state

  return (
    <span role="status" className="sr-only">
      {t(`auth.status.${status}`)}
    </span>
  )
}
