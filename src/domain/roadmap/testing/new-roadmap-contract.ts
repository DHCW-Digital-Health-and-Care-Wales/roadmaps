import { describe, expect, it } from "vitest"

import type { NewRoadmapInput } from "../new-roadmap"
import type {
  RoadmapRepositoryContractSetup,
  TemplateFault,
} from "./roadmap-repository-contract"
import { createTestRoadmap } from "./test-roadmap"

const medicines = {
  en: "Medicines & Diagnostics",
  cy: "Meddyginiaethau a Diagnosteg",
}
const community = {
  en: "GP & Community Services",
  cy: "Meddygon Teulu a Gwasanaethau Cymunedol",
}

/** A published roadmap in a family and a category, and one that is not published. */
const outpatients = createTestRoadmap(
  "outpatient-booking",
  "Outpatient Booking roadmap",
  {
    family: medicines,
    familyId: "vdkxj63m",
    colour: "#006747",
    category: community,
    categoryId: "khzpchkh",
  },
)
const draft = createTestRoadmap("pharmacy", "Pharmacy roadmap", {
  published: false,
})
const roadmaps = [outpatients, draft]

const input = (overrides: Partial<NewRoadmapInput> = {}): NewRoadmapInput => ({
  title: "Community Nursing roadmap",
  shortName: "Community Nursing",
  familyId: null,
  categoryId: "khzpchkh",
  productLead: "Sam Evans",
  ...overrides,
})

/** The roadmap `input()` adds, as the list then gives it. */
const communityNursing = createTestRoadmap(
  "community-nursing",
  "Community Nursing roadmap",
  {
    itemsLocation: "Community Nursing",
    published: false,
    category: community,
    categoryId: "khzpchkh",
    productLead: "Sam Evans",
  },
)

/**
 * Adding a roadmap (STY-040), as every `RoadmapRepository` does it: called from
 * `describeRoadmapRepositoryContract`.
 */
export function describeNewRoadmap(
  setup: RoadmapRepositoryContractSetup,
): void {
  describe("adding a roadmap (STY-040)", () => {
    it("adds it to the end of the list, not published, with no items (S2, S8)", async () => {
      const repository = setup.withRoadmaps(roadmaps)

      await expect(repository.addRoadmap(input())).resolves.toStrictEqual({
        status: "added",
        roadmap: communityNursing,
      })
      expect(await repository.listRoadmaps()).toStrictEqual([
        ...roadmaps,
        communityNursing,
      ])
      expect(
        await repository.listRoadmapItems("community-nursing"),
      ).toStrictEqual([])
    })

    it("copies a chosen family, and trims what was typed (S2)", async () => {
      const repository = setup.withRoadmaps(roadmaps)
      const added = createTestRoadmap("mon-2027", "Môn roadmap", {
        itemsLocation: "Môn 2027",
        published: false,
        family: medicines,
        familyId: "vdkxj63m",
        colour: "#006747",
      })

      await expect(
        repository.addRoadmap({
          title: "  Môn roadmap ",
          shortName: " Môn 2027  ",
          familyId: "vdkxj63m",
          categoryId: null,
          productLead: "   ",
        }),
      ).resolves.toStrictEqual({ status: "added", roadmap: added })
      expect(await repository.listRoadmaps()).toStrictEqual([
        ...roadmaps,
        added,
      ])
    })

    it("allows another roadmap's title (S3)", async () => {
      const repository = setup.withRoadmaps(roadmaps)

      await expect(
        repository.addRoadmap(
          input({
            title: "Outpatient Booking roadmap",
            shortName: "Outpatient Booking new",
          }),
        ),
      ).resolves.toMatchObject({ status: "added" })
      expect(
        (await repository.listRoadmaps()).map(({ id, title }) => [
          id,
          title.en,
        ]),
      ).toEqual([
        ["outpatient-booking", "Outpatient Booking roadmap"],
        ["pharmacy", "Pharmacy roadmap"],
        ["outpatient-booking-new", "Outpatient Booking roadmap"],
      ])
    })

    it.each([
      ["a published roadmap's address", "Outpatient Booking"],
      ["a roadmap's that is not published, in another letter case", "PHARMACY"],
    ])(
      "writes nothing for a short name in use: %s (S4)",
      async (_, shortName) => {
        const repository = setup.withRoadmaps(roadmaps)

        await expect(
          repository.addRoadmap(input({ shortName })),
        ).resolves.toEqual({ status: "short-name-taken" })
        expect(await repository.listRoadmaps()).toStrictEqual(roadmaps)
      },
    )

    it.each([
      [{ familyId: "gone1234" }, {}, ["familyId"]],
      [{ categoryId: "gone1234" }, {}, ["categoryId"]],
      [
        { familyId: "vdkxj63m" },
        { families: null, categories: null },
        ["familyId", "categoryId"],
      ],
    ] as const)(
      "writes nothing for a family or category no longer listed: %j (S5)",
      async (chosen, lists, fields) => {
        const repository = setup.withRoadmaps(roadmaps, {}, lists)
        const before = await repository.listRoadmaps()

        await expect(repository.addRoadmap(input(chosen))).resolves.toEqual({
          status: "choice-not-listed",
          fields,
        })
        expect(await repository.listRoadmaps()).toStrictEqual(before)
      },
    )

    it.each<TemplateFault>(["missing", "no-title-column", "no-horizon-column"])(
      "rejects with invalid-data, writing nothing, when its template is %s (S6)",
      async (templateFault) => {
        const repository = setup.withRoadmaps(roadmaps, {}, { templateFault })

        await expect(repository.addRoadmap(input())).rejects.toMatchObject({
          kind: "invalid-data",
        })
        expect(await repository.listRoadmaps()).toStrictEqual(roadmaps)
      },
    )

    it("rejects with a forbidden AppError when the write is refused, writing nothing (S7)", async () => {
      const repository = setup.withRoadmaps(
        roadmaps,
        {},
        { write: { fails: "forbidden" } },
      )

      await expect(repository.addRoadmap(input())).rejects.toMatchObject({
        kind: "forbidden",
      })
      expect(await repository.listRoadmaps()).toStrictEqual(roadmaps)
    })

    it("rejects with the abort reason when the signal is already aborted (S7)", async () => {
      const repository = setup.withRoadmaps(roadmaps)
      const reason = new DOMException("Cancelled by test", "AbortError")

      await expect(
        repository.addRoadmap(input(), { signal: AbortSignal.abort(reason) }),
      ).rejects.toBe(reason)
      expect(await repository.listRoadmaps()).toStrictEqual(roadmaps)
    })

    it("adds a roadmap whose answer is lost when a re-read finds this write (S7)", async () => {
      const repository = setup.withRoadmaps(
        roadmaps,
        {},
        { write: { lost: "applied" } },
      )

      await expect(repository.addRoadmap(input())).resolves.toStrictEqual({
        status: "added",
        roadmap: communityNursing,
      })
      expect(await repository.listRoadmaps()).toStrictEqual([
        ...roadmaps,
        communityNursing,
      ])
    })

    it("rejects an add whose answer is lost with a network AppError when a re-read finds nothing (S7)", async () => {
      const repository = setup.withRoadmaps(
        roadmaps,
        {},
        { write: { lost: "not-applied" } },
      )

      await expect(repository.addRoadmap(input())).rejects.toMatchObject({
        kind: "network",
      })
      expect(await repository.listRoadmaps()).toStrictEqual(roadmaps)
    })

    it("says the roadmap may have been added when the re-read fails too (S7)", async () => {
      const repository = setup.withRoadmaps(
        roadmaps,
        {},
        { write: { lost: "reread-fails" } },
      )

      await expect(repository.addRoadmap(input())).resolves.toEqual({
        status: "unconfirmed",
      })
    })
  })
}
