import { describe, expect, it } from "vitest"

import {
  type ItemChanges,
  NO_CHANGES,
  type RoadmapChanges,
} from "../roadmap-changes"
import type { RoadmapItem } from "../roadmap-item"
import type { RoadmapPlacement } from "../roadmap-placement"
import type {
  RoadmapItemsById,
  RoadmapRepositoryContractSetup,
} from "./roadmap-repository-contract"
import { addingItems, NEW_CLINIC } from "./test-new-item"
import { createTestRoadmap } from "./test-roadmap"
import { createTestRoadmapItem } from "./test-roadmap-item"

const live = createTestRoadmap("producta", "Product A")

/** An item with an ID, so a publish gives none a new one: its title, squeezed. */
function item(title: string, placement: RoadmapPlacement): RoadmapItem {
  const id = title
    .toLowerCase()
    .replaceAll(/[^a-z]/g, "")
    .padEnd(8, "x")
  return createTestRoadmapItem(title, { id: id.slice(0, 8), placement })
}

const a = item("A", "now")
const b = item("B", "now")
const c = item("C", "now")
const booking: RoadmapItem = {
  ...item("Online booking", "next"),
  title: { en: "Online booking", cy: "Archebu ar-lein" },
  phase: { en: "Beta", cy: "Beta" },
  tags: [{ en: "Patients", cy: "Cleifion" }],
  hasWelshTags: true,
  organisationIds: ["national"],
}
const video = item("Video consultations", "next")
const letters = item("Letters by email", "later")

/** The item's move to `placement`, as the page that loaded `items` holds it. */
function move(
  items: readonly RoadmapItem[],
  moved: RoadmapItem,
  placement: RoadmapPlacement,
): ItemChanges {
  return {
    item: moved,
    position: items.indexOf(moved),
    fields: { placement: { base: moved.placement ?? "", value: placement } },
  }
}

const moving = (...items: ItemChanges[]): RoadmapChanges => ({
  ...NO_CHANGES,
  items,
})

/** `moved` as a read gives it once its move to `placement` is published. */
const movedTo = (moved: RoadmapItem, placement: RoadmapPlacement) => ({
  ...moved,
  placement,
})

/**
 * Publishing a moved item (STY-051), as every `RoadmapRepository` does it: called from
 * `describeRoadmapRepositoryContract`.
 */
export function describeMovedItems(
  setup: RoadmapRepositoryContractSetup,
): void {
  describe("publishing a moved item (STY-051)", () => {
    /** Publishes `changes` over `items`, then reads the roadmap's items. */
    async function publish(
      items: readonly RoadmapItem[],
      changes: RoadmapChanges,
      options?: Parameters<typeof setup.withRoadmaps>[2],
    ) {
      const source: RoadmapItemsById = { producta: items }
      const repository = setup.withRoadmaps([live], source, options)
      const outcome = await repository
        .publishRoadmapChanges("producta", changes)
        .catch((error: unknown) => error)
      return { outcome, read: await repository.listRoadmapItems("producta") }
    }

    it("returns it last in its new placement, every other item as it was and in its order (S3)", async () => {
      const items = [booking, a, video, b, letters, c]

      const { outcome, read } = await publish(
        items,
        moving(move(items, booking, "now")),
      )

      expect(outcome).toEqual({ status: "published" })
      expect(read).toStrictEqual([
        a,
        video,
        b,
        letters,
        c,
        movedTo(booking, "now"),
      ])
    })

    it("puts it just after the placement's last item, not last of the roadmap (S3)", async () => {
      const items = [booking, a, b, letters]

      const { read } = await publish(items, moving(move(items, booking, "now")))

      expect(read).toStrictEqual([a, b, movedTo(booking, "now"), letters])
    })

    it("counts an item the placement holds that the page never read, and refuses nothing for it (S4)", async () => {
      const loaded = [booking, a, b, c]
      const added = item("D", "now")

      const { outcome, read } = await publish(
        [booking, a, b, c, added],
        moving(move(loaded, booking, "now")),
      )

      expect(outcome).toEqual({ status: "published" })
      expect(read).toStrictEqual([a, b, c, added, movedTo(booking, "now")])
    })

    it("leaves it where it is when that is already last in its new placement (S5)", async () => {
      const items = [a, b, booking, letters]

      const { outcome, read } = await publish(
        items,
        moving(move(items, booking, "now")),
      )

      expect(outcome).toEqual({ status: "published" })
      expect(read).toStrictEqual([a, b, movedTo(booking, "now"), letters])
    })

    it("leaves the one item moved into a placement with no items where it is (S5)", async () => {
      const items = [booking, a]

      const { read } = await publish(
        items,
        moving(move(items, booking, "later")),
      )

      expect(read).toStrictEqual([movedTo(booking, "later"), a])
    })

    it("returns several moved into one placement last in the order they were moved (S6)", async () => {
      const items = [video, a, booking, b]

      const { read } = await publish(
        items,
        moving(move(items, booking, "now"), move(items, video, "now")),
      )

      expect(read).toStrictEqual([
        a,
        b,
        movedTo(booking, "now"),
        movedTo(video, "now"),
      ])
    })

    it("puts the later moved after the earlier in a placement that had no items (S6)", async () => {
      const items = [video, a, booking]

      const { read } = await publish(
        items,
        moving(move(items, booking, "later"), move(items, video, "later")),
      )

      expect(read).toStrictEqual([
        a,
        movedTo(booking, "later"),
        movedTo(video, "later"),
      ])
    })

    it("returns a new item after every moved one (S6)", async () => {
      const items = [booking, video, a]

      const { read } = await publish(items, {
        ...addingItems({
          ...NEW_CLINIC,
          values: { ...NEW_CLINIC.values, placement: "now" },
        }),
        items: [move(items, booking, "now")],
      })

      expect(read.map(({ title }) => title.en)).toEqual([
        "Video consultations",
        "A",
        "Online booking",
        "Choose a clinic closer to home",
      ])
    })

    it("moves an item with its other changes, and beside another item's (S3)", async () => {
      const items = [booking, a, b]
      const moved = move(items, booking, "now")

      const { read } = await publish(
        items,
        moving(
          {
            ...moved,
            fields: { ...moved.fields, phase: { base: "Beta", value: "Live" } },
          },
          {
            item: a,
            position: 1,
            fields: { title: { base: "A", value: "A1" } },
          },
        ),
      )

      expect(read).toStrictEqual([
        { ...a, title: { en: "A1", cy: "" } },
        b,
        { ...movedTo(booking, "now"), phase: { en: "Live", cy: "Beta" } },
      ])
    })

    it("moves nothing when a co-lead's other move refuses the publish (S3)", async () => {
      const loaded = [booking, a, b]
      const theirs = [movedTo(booking, "later"), a, b]

      const { outcome, read } = await publish(
        theirs,
        moving(move(loaded, booking, "now")),
      )

      expect(outcome).toMatchObject({ status: "refused" })
      expect(read).toStrictEqual(theirs)
    })

    describe("when the write's answer is lost (S8)", () => {
      const items = [booking, a, b]
      const changes = moving(move(items, booking, "now"))

      it("is published, and moved, when a re-read finds its placement", async () => {
        const { outcome, read } = await publish(items, changes, {
          write: { lost: "applied" },
        })

        expect(outcome).toEqual({ status: "published" })
        expect(read).toStrictEqual([a, b, movedTo(booking, "now")])
      })

      it("rejects with a network AppError, nothing moved, when a re-read finds it where it was", async () => {
        const { outcome, read } = await publish(items, changes, {
          write: { lost: "not-applied" },
        })

        expect(outcome).toMatchObject({ kind: "network" })
        expect(read).toStrictEqual(items)
      })
    })
  })
}
