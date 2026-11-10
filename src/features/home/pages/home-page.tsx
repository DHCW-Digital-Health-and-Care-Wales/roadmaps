import { useAuth } from "@/features/auth/use-auth"
import { RoadmapsPage } from "@/features/roadmaps/pages/roadmaps-page"

import { WelcomeHero } from "../components/welcome-hero"

/** `/`: the roadmaps once connected, otherwise the welcome hero with Connect. */
export function HomePage() {
  const { state } = useAuth()
  return state.status === "connected" ? <RoadmapsPage /> : <WelcomeHero />
}
