import { describe, expect, it } from "vitest"

import { orderedItem } from "../placement-order"
import {
  NO_CHANGES,
  type OrderedItem,
  type PlacementOrder,
  type RoadmapChanges,
} from "../roadmap-changes"
import type { RoadmapItem } from "../roadmap-item"
import type { RoadmapPlacement } from "../roadmap-placement"
import type {
  RoadmapItemsById,
  RoadmapRepositoryContractSetup,
} from "./roadmap-repository-contract"
import { NEW_CLINIC } from "./test-new-item"
import { createTestRoadmap } from "./test-roadmap"
import { createTestRoadmapItem } from "./test-roadmap-item"

const live = createTestRoadmap("producta", "Product A")

/** An item with an ID, so a publish gives none a new one: its title, squeezed. */
function item(title: string, placement: RoadmapPlacement = "now"): RoadmapItem {
  const id = title
    .toLowerCase()
    .replaceAll(/[^a-z]/g, "")
    .padEnd(8, "x")
  return createTestRoadmapItem(title, { id: id.slice(0, 8), placement })
}

const a = item("A")
const b = item("B")
const c = item("C")
/** With Welsh and more, to show its row moves whole. */
const d: RoadmapItem = {
  ...item("D"),
  title: { en: "D", cy: "Ch" },
  phase: { en: "Beta", cy: "Beta" },
  tags: [{ en: "Patients", cy: "Cleifion" }],
  hasWelshTags: true,
  organisationIds: ["national"],
}
const video = item("Video consultations", "next")
const letters = item("Letters by email", "later")

/** Each item as an order holds it: every one here has an ID. */
const ordered = (...items: RoadmapItem[]): OrderedItem[] =>
  items.map((each, position) => orderedItem(each, position))

/** Now reordered from `base`, as the page loaded it, to `items`. */
const nowOrder = (
  base: readonly RoadmapItem[],
  items: readonly RoadmapItem[],
): PlacementOrder => ({
  placement: "now",
  base: ordered(...base),
  items: ordered(...items),
})

const reordering = (
  order: PlacementOrder,
  changes: Partial<RoadmapChanges> = {},
): RoadmapChanges => ({ ...NO_CHANGES, ...changes, orders: [order] })

const newClinic = {
  ...NEW_CLINIC,
  values: { ...NEW_CLINIC.values, placement: "now" },
}

/**
 * Publishing a placement's pending order (STY-050 S7–S10, S14), as every
 * `RoadmapRepository` does it: called from `describeRoadmapRepositoryContract`.
 */
export function describePlacementOrders(
  setup: RoadmapRepositoryContractSetup,
): void {
  describe("publishing a placement's order (STY-050)", () => {
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
      const read = await repository
        .listRoadmapItems("producta")
        .catch((error: unknown) => error)
      return { outcome, read }
    }
    const titles = (read: unknown) =>
      (read as RoadmapItem[]).map(({ title }) => title.en)

    it("returns the placement's items in the published order, each as it was, and every other item in its order (S7, S16)", async () => {
      const items = [video, a, b, letters, c, d]

      const { outcome, read } = await publish(
        items,
        reordering(nowOrder([a, b, c, d], [d, a, b, c])),
      )

      expect(outcome).toEqual({ status: "published" })
      expect(read).toStrictEqual([video, d, a, b, letters, c])
    })

    it("orders items that had no ID, giving each one (S7)", async () => {
      const first = createTestRoadmapItem("First")
      const second = createTestRoadmapItem("Second")
      const third = createTestRoadmapItem("Third")
      const items = [first, second, third]

      const { outcome, read } = await publish(
        items,
        reordering({
          placement: "now",
          base: ordered(first, second, third),
          items: [
            orderedItem(third, 2),
            orderedItem(first, 0),
            orderedItem(second, 1),
          ],
        }),
      )

      expect(outcome).toEqual({ status: "published" })
      expect(titles(read)).toEqual(["Third", "First", "Second"])
      expect((read as RoadmapItem[]).every(({ id }) => id !== null)).toBe(true)
    })

    it("orders the placement with an edit of one of its items and a move into it (S5)", async () => {
      const items = [video, a, b]

      const { outcome, read } = await publish(
        items,
        reordering(nowOrder([a, b], [b, video, a]), {
          items: [
            {
              item: video,
              position: 0,
              fields: { placement: { base: "next", value: "now" } },
            },
            {
              item: a,
              position: 1,
              fields: { title: { base: "A", value: "A1" } },
            },
          ],
        }),
      )

      expect(outcome).toEqual({ status: "published" })
      expect(read).toStrictEqual([
        b,
        { ...video, placement: "now" },
        { ...a, title: { en: "A1", cy: "" } },
      ])
    })

    it("returns a new item that is not last where the order has it, and one that stays last after the roadmap's last (S8)", async () => {
      const items = [a, b, letters]
      const last = {
        id: "zzxtqwmn",
        values: { ...newClinic.values, title: "Last" },
      }

      const { outcome, read } = await publish(
        items,
        reordering(
          {
            placement: "now",
            base: ordered(a, b),
            items: [
              ...ordered(a),
              { id: newClinic.id },
              ...ordered(b),
              { id: last.id },
            ],
          },
          { newItems: [newClinic, last] },
        ),
      )

      expect(outcome).toEqual({ status: "published" })
      expect(titles(read)).toEqual([
        "A",
        "Choose a clinic closer to home",
        "B",
        "Letters by email",
        "Last",
      ])
      expect(read).toMatchObject([
        a,
        { id: newClinic.id, placement: "now" },
        b,
        letters,
        { id: last.id, placement: "now" },
      ])
    })

    it("writes nothing for an order the roadmap already holds (S9)", async () => {
      const items = [d, a, b, c]

      const { outcome, read } = await publish(
        items,
        reordering(nowOrder([a, b, c, d], [d, a, b, c])),
      )

      expect(outcome).toEqual({ status: "published" })
      expect(read).toStrictEqual(items)
    })

    describe("when a co-lead changed the placement's items (S10)", () => {
      const order = nowOrder([a, b, c, d], [d, a, b, c])
      const theirs = item("E")

      it.each<[string, RoadmapItem[], RoadmapItem[]]>([
        ["reordered them", [b, a, c, d], [b, a, c, d]],
        ["added one", [a, b, c, d, theirs], [a, b, c, d, theirs]],
        [
          "moved one in",
          [{ ...video, placement: "now" }, a, b, c, d],
          [{ ...video, placement: "now" }, a, b, c, d],
        ],
        ["moved one out", [a, { ...b, placement: "later" }, c, d], [a, c, d]],
        ["removed one", [a, b, d], [a, b, d]],
      ])(
        "publishes nothing and reports the order conflict when they %s",
        async (_, items, current) => {
          const { outcome, read } = await publish(items, reordering(order))

          expect(outcome).toEqual({
            status: "refused",
            conflicts: [
              {
                subject: "order",
                placement: "now",
                base: order.base,
                pending: order.items,
                current: current.map((each) => ({
                  item: { id: each.id },
                  title: each.title,
                })),
              },
            ],
            missingItems: [],
          })
          expect(read).toStrictEqual(items)
        },
      )

      it("publishes the order all the same when they changed another placement, or an item's text", async () => {
        const renamed = { ...a, title: { en: "Their A", cy: "" } }

        const { outcome, read } = await publish(
          [letters, renamed, b, item("Theirs", "next"), c, d],
          reordering(order),
        )

        expect(outcome).toEqual({ status: "published" })
        expect(titles(read)).toEqual([
          "Letters by email",
          "D",
          "Their A",
          "B",
          "Theirs",
          "C",
        ])
      })

      it("reports an edited item they removed as not found, and no conflict when the order differs by it alone", async () => {
        const edit = {
          item: b,
          position: 1,
          fields: { title: { base: "B", value: "My B" } },
        }

        const { outcome } = await publish(
          [a, c, d],
          reordering(order, { items: [edit] }),
        )

        expect(outcome).toEqual({
          status: "refused",
          conflicts: [],
          missingItems: [edit],
        })
      })

      it("publishes the order kept over theirs, their item last (S12)", async () => {
        const items = [a, b, c, d, theirs]

        const { outcome, read } = await publish(
          items,
          reordering({ ...order, base: ordered(...items) }),
        )

        expect(outcome).toEqual({ status: "published" })
        expect(read).toStrictEqual([d, a, b, c, theirs])
      })
    })

    describe("when the write's answer is lost (S14)", () => {
      const items = [a, b, c, d]
      const changes = reordering(nowOrder(items, [d, a, b, c]))

      it("is published when a re-read finds the placement in the pending order", async () => {
        const { outcome, read } = await publish(items, changes, {
          write: { lost: "applied" },
        })

        expect(outcome).toEqual({ status: "published" })
        expect(read).toStrictEqual([d, a, b, c])
      })

      it("rejects with a network AppError when a re-read finds it in the order it had", async () => {
        const { outcome, read } = await publish(items, changes, {
          write: { lost: "not-applied" },
        })

        expect(outcome).toMatchObject({ kind: "network" })
        expect(read).toStrictEqual(items)
      })

      it("is unconfirmed when a re-read finds the order and not a value written with it", async () => {
        const { outcome } = await publish(
          items,
          { ...changes, roadmap: { vision: { base: "", value: "A vision" } } },
          { write: { lost: "partly-applied" } },
        )

        expect(outcome).toEqual({ status: "unconfirmed" })
      })

      it("is unconfirmed when the re-read fails", async () => {
        const { outcome } = await publish(items, changes, {
          write: { lost: "reread-fails" },
        })

        expect(outcome).toEqual({ status: "unconfirmed" })
      })
    })

    it("publishes an order with “Save and publish” too (S8)", async () => {
      const draft = { ...live, published: false }
      const items = [a, b, c, d]
      const repository = setup.withRoadmaps([draft], { producta: items })

      const outcome = await repository.setRoadmapPublished(draft, {
        published: true,
        changes: reordering(nowOrder(items, [d, a, b, c])),
      })

      expect(outcome).toEqual({ status: "set" })
      expect(await repository.listRoadmapItems("producta")).toStrictEqual([
        d,
        a,
        b,
        c,
      ])
    })
  })
}
