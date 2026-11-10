import { describeRoadmapRepositoryContract } from "@/domain/roadmap/testing/roadmap-repository-contract"
import { AppError } from "@/lib/errors"

import { createInMemoryRoadmapRepository } from "./in-memory-roadmap-repository"

describeRoadmapRepositoryContract("createInMemoryRoadmapRepository", {
  withRoadmaps: (roadmaps) => createInMemoryRoadmapRepository(roadmaps),
  failing: () => createInMemoryRoadmapRepository(new AppError("network")),
})
