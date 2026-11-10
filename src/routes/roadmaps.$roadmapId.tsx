import { createFileRoute } from "@tanstack/react-router"

import { RoadmapDetailPage } from "@/features/roadmaps/pages/roadmap-detail-page"

export const Route = createFileRoute("/roadmaps/$roadmapId")({
  component: RoadmapDetailPage,
})
