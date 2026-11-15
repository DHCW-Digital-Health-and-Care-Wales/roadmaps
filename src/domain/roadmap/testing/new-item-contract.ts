import { describe, expect, it } from "vitest"

import {
  type FieldChange,
  NO_CHANGES,
  type RoadmapChanges,
} from "../roadmap-changes"
import { CO_LEAD_VALUE } from "./contract-write"
import type { RoadmapRepositoryContractSetup } from "./roadmap-repository-contract"
import { addingItems, NEW_CLINIC, NEW_LETTERS } from "./test-new-item"
import { createTestRoadmap } from "./test-roadmap"
import { createTestRoadmapItem } from "./test-roadmap-item"

const change = (base: string, value: string): FieldChange => ({ base, value })

/** Product A, published, as the page loaded it, and the same not published. */
const live = createTestRoadmap("producta", "Product A", {
  statusLabel: { en: "Beta", cy: "" },
})
const draft = { ...live, published: false }
const other = createTestRoadmap("productb", "Product B")

/** Product A's items, each with its ID, so a publish gives none a new one. */
const booking = createTestRoadmapItem("Online booking", {
  id: "k7q2xwbn",
  phase: { en: "Beta", cy: "Beta" },
})
const reminders = createTestRoadmapItem("Text reminders", {
  id: "m4t8vzcd",
  placement: "later",
})
const items = { producta: [booking, reminders] }

/** The item a read gives once `NEW_CLINIC` is published. */
const clinicRead = createTestRoadmapItem("Choose a clinic closer to home", {
  id: "ckn7q2xw",
  placement: "next",
})

/** The item a read gives once `NEW_LETTERS` is published: tidied, in English alone. */
const lettersRead = createTestRoadmapItem("Letters by email", {
  id: "fwd9s3hj",
  description: { en: "Read your letters online.\nNo post.", cy: "" },
  expectedOutcome: { en: "Fewer lost letters", cy: "" },
  phase: { en: "Discovery", cy: "" },
  placement: "delivered-this-year",
  tags: [
    { en: "Patients", cy: "" },
    { en: "Carers", cy: "" },
  ],
  organisationIds: ["national", "sbuhb"],
  details: [
    { text: { en: "Appointment letters", cy: "" }, level: 0 },
    { text: { en: "Outpatients", cy: "" }, level: 1 },
    { text: { en: "Adult clinics first", cy: "" }, level: 2 },
  ],
})

/** `NEW_CLINIC` beside an edit to the phase of `booking`, which is found by its ID. */
const clinicAndEdit: RoadmapChanges = {
  ...NO_CHANGES,
  items: [
    { item: booking, position: 0, fields: { phase: change("Beta", "Live") } },
  ],
  newItems: [NEW_CLINIC],
}
const bookingLive = { ...booking, phase: { en: "Live", cy: "Beta" } }

/**
 * Publishing a roadmap's new items (STY-045), as every `RoadmapRepository` does it:
 * called from `describeRoadmapRepositoryContract`.
 */
export function describeNewItems(setup: RoadmapRepositoryContractSetup): void {
  describe("publishing a new item (STY-045)", () => {
    it("adds it after the roadmap's last item, with its ID, title and placement (S2, S5)", async () => {
      const repository = setup.withRoadmaps([live, other], items)

      await expect(
        repository.publishRoadmapChanges("producta", addingItems(NEW_CLINIC)),
      ).resolves.toEqual({ status: "published" })
      expect(await repository.listRoadmapItems("producta")).toStrictEqual([
        booking,
        reminders,
        clinicRead,
      ])
      expect(await repository.listRoadmaps()).toStrictEqual([live, other])
      expect(await repository.listRoadmapItems("productb")).toStrictEqual([])
    })

    it("writes every field it has as that field's edit is written, in English alone (S2)", async () => {
      const repository = setup.withRoadmaps([live, other], items)

      await repository.publishRoadmapChanges(
        "producta",
        addingItems(NEW_LETTERS),
      )

      expect(await repository.listRoadmapItems("producta")).toStrictEqual([
        booking,
        reminders,
        lettersRead,
      ])
    })

    it("adds several in the order they were added, in the one write with the roadmap's other changes (S2)", async () => {
      const repository = setup.withRoadmaps([live, other], items)

      const outcome = await repository.publishRoadmapChanges("producta", {
        ...clinicAndEdit,
        roadmap: { statusLabel: change("Beta", "Live") },
        newItems: [NEW_LETTERS, NEW_CLINIC],
      })

      expect(outcome).toEqual({ status: "published" })
      expect(await repository.listRoadmaps()).toStrictEqual([
        { ...live, statusLabel: { en: "Live", cy: "" } },
        other,
      ])
      expect(await repository.listRoadmapItems("producta")).toStrictEqual([
        bookingLive,
        reminders,
        lettersRead,
        clinicRead,
      ])
    })

    it("starts a roadmap that has no items", async () => {
      const repository = setup.withRoadmaps([live, other])

      await repository.publishRoadmapChanges(
        "producta",
        addingItems(NEW_CLINIC),
      )

      expect(await repository.listRoadmapItems("producta")).toStrictEqual([
        clinicRead,
      ])
    })

    it("publishes nothing, the new item neither, when a co-lead changed a field edited with it (S3)", async () => {
      const theirs = { ...booking, phase: { en: "Alpha", cy: "Beta" } }
      const repository = setup.withRoadmaps([live, other], {
        producta: [theirs, reminders],
      })

      const outcome = await repository.publishRoadmapChanges(
        "producta",
        clinicAndEdit,
      )

      expect(outcome).toMatchObject({
        status: "refused",
        conflicts: [{ subject: "item", field: "phase", current: "Alpha" }],
        missingItems: [],
      })
      expect(await repository.listRoadmapItems("producta")).toStrictEqual([
        theirs,
        reminders,
      ])
    })

    it("publishes nothing, the new item neither, when an item edited with it is gone (S3)", async () => {
      const repository = setup.withRoadmaps([live, other], {
        producta: [reminders],
      })

      const outcome = await repository.publishRoadmapChanges(
        "producta",
        clinicAndEdit,
      )

      expect(outcome).toEqual({
        status: "refused",
        conflicts: [],
        missingItems: clinicAndEdit.items,
      })
      expect(await repository.listRoadmapItems("producta")).toStrictEqual([
        reminders,
      ])
    })

    it("is added whatever a co-lead did to the roadmap's other items, even one with its title (S3)", async () => {
      const added = createTestRoadmapItem("Choose a clinic closer to home", {
        id: "theirs23",
      })
      const repository = setup.withRoadmaps([live, other], {
        producta: [added, reminders, bookingLive],
      })

      const outcome = await repository.publishRoadmapChanges(
        "producta",
        clinicAndEdit,
      )

      expect(outcome).toEqual({ status: "published" })
      expect(await repository.listRoadmapItems("producta")).toStrictEqual([
        added,
        reminders,
        bookingLive,
        clinicRead,
      ])
    })

    it("fails as an edit does when the roadmap is no longer listed, or its items can't be read (S3)", async () => {
      const repository = setup.withRoadmaps([live, other], items, {
        unreadableItems: ["productb"],
      })

      await expect(
        repository.publishRoadmapChanges("unknown", addingItems(NEW_CLINIC)),
      ).resolves.toEqual({ status: "roadmap-not-found" })
      await expect(
        repository.publishRoadmapChanges("productb", addingItems(NEW_CLINIC)),
      ).rejects.toMatchObject({ kind: "invalid-data", retryable: false })
    })

    it("takes a new item the roadmap already holds as published, writing no second one (S4)", async () => {
      const landed = { ...clinicRead, title: { en: "Renamed since", cy: "" } }
      const repository = setup.withRoadmaps([live, other], {
        producta: [booking, landed],
      })

      await expect(
        repository.publishRoadmapChanges("producta", addingItems(NEW_CLINIC)),
      ).resolves.toEqual({ status: "published" })
      expect(await repository.listRoadmapItems("producta")).toStrictEqual([
        booking,
        landed,
      ])
    })

    it.each([
      ["a blank title", { title: " " }],
      ["no placement", { placement: "" }],
    ])(
      "rejects one with %s, which a screen never sends, writing nothing (S1)",
      async (_case, values) => {
        const repository = setup.withRoadmaps([live, other], items)
        const invalid = {
          ...NEW_CLINIC,
          values: { ...NEW_CLINIC.values, ...values },
        }

        await expect(
          repository.publishRoadmapChanges("producta", addingItems(invalid)),
        ).rejects.toMatchObject({ kind: "unknown" })
        expect(await repository.listRoadmapItems("producta")).toStrictEqual(
          items.producta,
        )
      },
    )

    describe("when the write's answer is lost (S4)", () => {
      it("is published when a re-read finds the new item and every other change", async () => {
        const repository = setup.withRoadmaps([live, other], items, {
          write: { lost: "applied" },
        })

        await expect(
          repository.publishRoadmapChanges("producta", clinicAndEdit),
        ).resolves.toEqual({ status: "published" })
        expect(await repository.listRoadmapItems("producta")).toStrictEqual([
          bookingLive,
          reminders,
          clinicRead,
        ])
      })

      it("is published when a re-read finds a new item that was all there was to write", async () => {
        const repository = setup.withRoadmaps([live, other], items, {
          write: { lost: "applied" },
        })

        await expect(
          repository.publishRoadmapChanges("producta", addingItems(NEW_CLINIC)),
        ).resolves.toEqual({ status: "published" })
      })

      it.each([
        ["with an edit", clinicAndEdit],
        ["alone", addingItems(NEW_CLINIC)],
      ])(
        "rejects with a network AppError when a re-read finds none of a new item %s",
        async (_case, changes) => {
          const repository = setup.withRoadmaps([live, other], items, {
            write: { lost: "not-applied" },
          })

          await expect(
            repository.publishRoadmapChanges("producta", changes),
          ).rejects.toMatchObject({ kind: "network" })
          expect(await repository.listRoadmapItems("producta")).toStrictEqual(
            items.producta,
          )
        },
      )

      it("is unconfirmed when a re-read finds the new item, but a co-lead's value where an edit was written", async () => {
        const repository = setup.withRoadmaps([live, other], items, {
          write: { lost: "partly-applied" },
        })

        await expect(
          repository.publishRoadmapChanges("producta", clinicAndEdit),
        ).resolves.toEqual({ status: "unconfirmed" })
        expect(await repository.listRoadmapItems("producta")).toStrictEqual([
          { ...booking, phase: { en: CO_LEAD_VALUE, cy: "Beta" } },
          reminders,
          clinicRead,
        ])
      })

      it("is unconfirmed when the re-read fails", async () => {
        const repository = setup.withRoadmaps([live, other], items, {
          write: { lost: "reread-fails" },
        })

        await expect(
          repository.publishRoadmapChanges("producta", addingItems(NEW_CLINIC)),
        ).resolves.toEqual({ status: "unconfirmed" })
      })
    })

    describe("with the roadmap published at once (“Save and publish”, STY-035)", () => {
      it("is written with the roadmap's published state, in one write", async () => {
        const repository = setup.withRoadmaps([draft, other], items)

        await expect(
          repository.setRoadmapPublished(draft, {
            published: true,
            changes: addingItems(NEW_CLINIC),
          }),
        ).resolves.toEqual({ status: "set" })
        expect(await repository.listRoadmaps()).toStrictEqual([live, other])
        expect(await repository.listRoadmapItems("producta")).toStrictEqual([
          booking,
          reminders,
          clinicRead,
        ])
      })

      it("is still written when a co-lead already published the roadmap", async () => {
        const repository = setup.withRoadmaps([live, other], items)

        await expect(
          repository.setRoadmapPublished(draft, {
            published: true,
            changes: addingItems(NEW_CLINIC),
          }),
        ).resolves.toEqual({ status: "set" })
        expect(await repository.listRoadmapItems("producta")).toStrictEqual([
          booking,
          reminders,
          clinicRead,
        ])
      })

      it("publishes a roadmap whose items had nowhere to say their placement, which the new item adds", async () => {
        const repository = setup.withRoadmaps([draft, other], items, {
          syncFaults: { producta: ["no-horizon-column"] },
        })

        await expect(
          repository.setRoadmapPublished(draft, {
            published: true,
            changes: addingItems(NEW_CLINIC),
          }),
        ).resolves.toEqual({ status: "set" })
        expect(await repository.listRoadmaps()).toStrictEqual([live, other])
        expect(
          (await repository.listRoadmapItems("producta")).at(-1),
        ).toStrictEqual(clinicRead)
      })
    })
  })
}
