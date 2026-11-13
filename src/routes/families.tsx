import { createFileRoute } from "@tanstack/react-router"

import { FamiliesPage } from "@/features/roadmaps/pages/families-page"

export const Route = createFileRoute("/families")({
  component: FamiliesPage,
})
