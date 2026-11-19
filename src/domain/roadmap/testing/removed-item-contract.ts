import { describe, expect, it } from "vitest"

import {
  type FieldChange,
  type ItemRemoval,
  NO_CHANGES,
  type RoadmapChanges,
} from "../roadmap-changes"
import type { RoadmapItem } from "../roadmap-item"
import { orderedItem } from "../placement-order"
import { CO_LEAD_VALUE } from "./contract-write"
import type { RoadmapRepositoryContractSetup } from "./roadmap-repository-contract"
import { NEW_CLINIC } from "./test-new-item"
import { createTestRoadmap } from "./test-roadmap"
import { createTestRoadmapItem } from "./test-roadmap-item"

const change = (base: string, value: string): FieldChange => ({ base, value })

/** Product A, published, as the page loaded it. */
const live = createTestRoadmap("producta", "Product A", {
  statusLabel: { en: "Beta", cy: "" },
})
const other = createTestRoadmap("productb", "Product B")

/** Product A's items, each with its ID but `letters`, so a publish gives none a new one. */
const booking = createTestRoadmapItem("Online booking", {
  id: "k7q2xwbn",
  phase: { en: "Beta", cy: "Beta" },
})
const faxes = createTestRoadmapItem("Fax referrals", {
  id: "m4t8vzcd",
  description: { en: "Referrals by fax.", cy: "" },
})
const letters = createTestRoadmapItem("Letters by email")
const reminders = createTestRoadmapItem("Text reminders", {
  id: "pdq3n8sw",
  placement: "later",
})
const items = { producta: [booking, faxes, reminders] }

/** The item a read gives once `NEW_CLINIC` is published. */
const clinicRead = createTestRoadmapItem("Choose a clinic closer to home", {
  id: "ckn7q2xw",
  placement: "next",
})

const removingFaxes: ItemRemoval = { item: faxes, position: 1 }
const removing = (
  removals: ItemRemoval[],
  changes: Partial<RoadmapChanges> = {},
): RoadmapChanges => ({ ...NO_CHANGES, ...changes, removals })
/** The removal of `faxes` beside a change to the roadmap's status label. */
const withStatus = removing([removingFaxes], {
  roadmap: { statusLabel: change("Beta", "Live") },
})
const liveStatus = { ...live, statusLabel: { en: "Live", cy: "" } }

/**
 * Publishing a roadmap's removed items (STY-070), as every `RoadmapRepository` does it:
 * called from `describeRoadmapRepositoryContract`.
 */
export function describeRemovedItems(
  setup: RoadmapRepositoryContractSetup,
): void {
  describe("publishing a removed item (STY-070)", () => {
    it("deletes it, leaving every other item and roadmap as it was (S2, S7)", async () => {
      const repository = setup.withRoadmaps([live, other], items)

      await expect(
        repository.publishRoadmapChanges("producta", removing([removingFaxes])),
      ).resolves.toEqual({ status: "published" })
      expect(await repository.listRoadmapItems("producta")).toStrictEqual([
        booking,
        reminders,
      ])
      expect(await repository.listRoadmaps()).toStrictEqual([live, other])
    })

    it("deletes it in the one write with every other change, its own edits left unwritten (S1, S2)", async () => {
      const repository = setup.withRoadmaps([live, other], items)

      const outcome = await repository.publishRoadmapChanges(
        "producta",
        removing([removingFaxes], {
          roadmap: { statusLabel: change("Beta", "Live") },
          items: [
            {
              item: faxes,
              position: 1,
              fields: { phase: change("", "Live") },
            },
            {
              item: booking,
              position: 0,
              fields: { phase: change("Beta", "Live") },
            },
            {
              item: reminders,
              position: 2,
              fields: { placement: change("later", "now") },
            },
          ],
          newItems: [NEW_CLINIC],
        }),
      )

      expect(outcome).toEqual({ status: "published" })
      expect(await repository.listRoadmaps()).toStrictEqual([liveStatus, other])
      expect(await repository.listRoadmapItems("producta")).toStrictEqual([
        { ...booking, phase: { en: "Live", cy: "Beta" } },
        { ...reminders, placement: "now" },
        clinicRead,
      ])
    })

    it("deletes an item without an ID found at its position (S2)", async () => {
      const repository = setup.withRoadmaps([live, other], {
        producta: [booking, letters, reminders],
      })

      await expect(
        repository.publishRoadmapChanges(
          "producta",
          removing([{ item: letters, position: 1 }]),
        ),
      ).resolves.toEqual({ status: "published" })
      expect(await repository.listRoadmapItems("producta")).toStrictEqual([
        booking,
        reminders,
      ])
    })

    it.each<[string, RoadmapChanges["newItems"], RoadmapItem[]]>([
      ["alone", [], []],
      ["beside a new one", [NEW_CLINIC], [clinicRead]],
    ])(
      "leaves the roadmap no items but new ones once each is removed, %s (S3)",
      async (_, newItems, after) => {
        const repository = setup.withRoadmaps([live, other], items)

        await expect(
          repository.publishRoadmapChanges(
            "producta",
            removing(
              [
                { item: booking, position: 0 },
                removingFaxes,
                { item: reminders, position: 2 },
              ],
              { newItems },
            ),
          ),
        ).resolves.toEqual({ status: "published" })
        expect(await repository.listRoadmapItems("producta")).toStrictEqual(
          after,
        )
      },
    )

    it("leaves the removed item out of its placement's pending order (S1)", async () => {
      const now = (title: string, id: string) =>
        createTestRoadmapItem(title, { id })
      const a = now("A", "aidxxxxx")
      const b = now("B", "bidxxxxx")
      const c = now("C", "cidxxxxx")
      const repository = setup.withRoadmaps([live, other], {
        producta: [a, b, c],
      })

      await expect(
        repository.publishRoadmapChanges(
          "producta",
          removing([{ item: b, position: 1 }], {
            orders: [
              {
                placement: "now",
                base: [a, b, c].map(orderedItem),
                items: [c, b, a].map((each) =>
                  orderedItem(each, [a, b, c].indexOf(each)),
                ),
              },
            ],
          }),
        ),
      ).resolves.toEqual({ status: "published" })
      expect(await repository.listRoadmapItems("producta")).toStrictEqual([
        c,
        a,
      ])
    })

    describe("a co-lead's change to the item (S4)", () => {
      it.each<[string, Partial<RoadmapItem>, string, string, string]>([
        [
          "its description",
          { description: { en: "Referrals by secure email.", cy: "" } },
          "description",
          "Referrals by fax.",
          "Referrals by secure email.",
        ],
        ["its horizon", { placement: "later" }, "placement", "now", "later"],
        [
          "its Welsh title alone",
          { title: { en: "Fax referrals", cy: "Atgyfeiriadau ffacs" } },
          "title",
          "Fax referrals",
          "Fax referrals",
        ],
      ])(
        "writes nothing when they changed %s, and says which field, loaded beside current",
        async (_, changed, field, base, current) => {
          const theirs = { ...faxes, ...changed }
          const repository = setup.withRoadmaps([live, other], {
            producta: [booking, theirs, reminders],
          })

          await expect(
            repository.publishRoadmapChanges("producta", withStatus),
          ).resolves.toEqual({
            status: "refused",
            conflicts: [
              {
                subject: "removal",
                removal: removingFaxes,
                current: theirs,
                fields: [{ field, base, current }],
              },
            ],
            missingItems: [],
          })
          expect(await repository.listRoadmaps()).toStrictEqual([live, other])
          expect(await repository.listRoadmapItems("producta")).toStrictEqual([
            booking,
            theirs,
            reminders,
          ])
        },
      )

      it("deletes it wherever a co-lead's reorder has put it, which is no conflict", async () => {
        const repository = setup.withRoadmaps([live, other], {
          producta: [faxes, booking, reminders],
        })

        await expect(
          repository.publishRoadmapChanges("producta", withStatus),
        ).resolves.toEqual({ status: "published" })
        expect(await repository.listRoadmapItems("producta")).toStrictEqual([
          booking,
          reminders,
        ])
      })
    })

    describe("an item already gone (S5)", () => {
      it("counts one whose ID no row holds as removed, and publishes the rest", async () => {
        const repository = setup.withRoadmaps([live, other], {
          producta: [booking, reminders],
        })

        await expect(
          repository.publishRoadmapChanges("producta", withStatus),
        ).resolves.toEqual({ status: "published" })
        expect(await repository.listRoadmaps()).toStrictEqual([
          liveStatus,
          other,
        ])
        expect(await repository.listRoadmapItems("producta")).toStrictEqual([
          booking,
          reminders,
        ])
      })

      it("writes nothing, saying which item, for one without an ID a co-lead edited", async () => {
        const removal = { item: letters, position: 1 }
        const theirs = { ...letters, phase: { en: "Beta", cy: "" } }
        const repository = setup.withRoadmaps([live, other], {
          producta: [booking, theirs, reminders],
        })

        const outcome = await repository.publishRoadmapChanges(
          "producta",
          removing([removal], {
            roadmap: { statusLabel: change("Beta", "Live") },
          }),
        )

        expect(outcome).toEqual({
          status: "refused",
          conflicts: [],
          missingItems: [removal],
        })
        expect(outcome.status === "refused" && outcome.missingItems[0]).toBe(
          removal,
        )
        expect(await repository.listRoadmaps()).toStrictEqual([live, other])
      })
    })

    describe("a write whose answer is lost (S6)", () => {
      it("is published when a re-read finds the item gone and every other write held", async () => {
        const repository = setup.withRoadmaps([live, other], items, {
          write: { lost: "applied" },
        })

        await expect(
          repository.publishRoadmapChanges("producta", withStatus),
        ).resolves.toEqual({ status: "published" })
        expect(await repository.listRoadmapItems("producta")).toStrictEqual([
          booking,
          reminders,
        ])
      })

      it("is published when a re-read finds an item without an ID gone from its position", async () => {
        const repository = setup.withRoadmaps(
          [live, other],
          { producta: [booking, letters, reminders] },
          { write: { lost: "applied" } },
        )

        await expect(
          repository.publishRoadmapChanges(
            "producta",
            removing([{ item: letters, position: 1 }]),
          ),
        ).resolves.toEqual({ status: "published" })
      })

      it.each([
        ["with another change", withStatus],
        ["alone", removing([removingFaxes])],
        [
          "of an item without an ID",
          removing([{ item: letters, position: 2 }]),
        ],
      ])(
        "rejects with a network AppError when a re-read finds nothing written, a removal %s",
        async (_, changes) => {
          const before = [booking, faxes, letters, reminders]
          const repository = setup.withRoadmaps(
            [live, other],
            { producta: before },
            { write: { lost: "not-applied" } },
          )

          await expect(
            repository.publishRoadmapChanges("producta", changes),
          ).rejects.toMatchObject({ kind: "network" })
          expect(await repository.listRoadmapItems("producta")).toStrictEqual(
            before,
          )
        },
      )

      it("is unconfirmed when a re-read finds the item gone, but a co-lead's value where an edit was written", async () => {
        const repository = setup.withRoadmaps([live, other], items, {
          write: { lost: "partly-applied" },
        })

        await expect(
          repository.publishRoadmapChanges("producta", withStatus),
        ).resolves.toEqual({ status: "unconfirmed" })
        expect(await repository.listRoadmaps()).toStrictEqual([
          { ...live, statusLabel: { en: CO_LEAD_VALUE, cy: "" } },
          other,
        ])
      })

      it("is unconfirmed when the re-read fails", async () => {
        const repository = setup.withRoadmaps([live, other], items, {
          write: { lost: "reread-fails" },
        })

        await expect(
          repository.publishRoadmapChanges("producta", withStatus),
        ).resolves.toEqual({ status: "unconfirmed" })
      })
    })

    it("deletes it with the roadmap's published state, in one write (“Save and publish”)", async () => {
      const draft = { ...live, published: false }
      const repository = setup.withRoadmaps([draft, other], items)

      await expect(
        repository.setRoadmapPublished(draft, {
          published: true,
          changes: removing([removingFaxes]),
        }),
      ).resolves.toEqual({ status: "set" })
      expect(await repository.listRoadmaps()).toStrictEqual([live, other])
      expect(await repository.listRoadmapItems("producta")).toStrictEqual([
        booking,
        reminders,
      ])
    })
  })
}
