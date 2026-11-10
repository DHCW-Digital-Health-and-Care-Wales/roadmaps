import { createFileRoute } from "@tanstack/react-router"

import { RoadmapDetailPage } from "@/features/roadmaps/pages/roadmap-detail-page"

export const Route = createFileRoute("/roadmaps/$roadmapId")({
  component: RoadmapDetailRoute,
})

function RoadmapDetailRoute() {
  const { roadmapId } = Route.useParams()
  return <RoadmapDetailPage roadmapId={roadmapId} />
}
