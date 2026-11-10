import { useState } from "react"

import type { AuthState } from "@/domain/auth/auth-client"
import { useAuth } from "@/features/auth/use-auth"
import { RoadmapsPage } from "@/features/roadmaps/pages/roadmaps-page"

import { WelcomeHero } from "../components/welcome-hero"

/** Connected, or expired: the roadmaps stay put with a Reconnect prompt. */
function hasSession(status: AuthState["status"]): boolean {
  return status === "connected" || status === "expired"
}

/**
 * `/`: the roadmaps while there is a session (live or expired), otherwise the welcome
 * hero with Connect. While connecting, it keeps whichever view started the attempt, so
 * reconnecting from the roadmaps does not flash the hero.
 */
export function HomePage() {
  const { status } = useAuth().state
  const [showRoadmaps, setShowRoadmaps] = useState(() => hasSession(status))
  if (status !== "connecting" && hasSession(status) !== showRoadmaps) {
    // Derived from the previous render's choice (React's "storing information from
    // previous renders" pattern); no effect needed.
    setShowRoadmaps(hasSession(status))
  }

  const roadmaps = status === "connecting" ? showRoadmaps : hasSession(status)
  return roadmaps ? <RoadmapsPage /> : <WelcomeHero />
}
