import { describe, expect, it } from "vitest"

import type { Family } from "../family"
import type { PublishedStateChange } from "../published-state"
import {
  type FieldChange,
  markedUpdated,
  type RoadmapChanges,
} from "../roadmap-changes"
import type { RoadmapRepositoryContractSetup } from "./roadmap-repository-contract"
import { createTestRoadmap } from "./test-roadmap"
import { createTestRoadmapItem } from "./test-roadmap-item"

const change = (base: string, value: string): FieldChange => ({ base, value })

/** Product A as the page loaded it: not published, coloured without a family. */
const draft = createTestRoadmap("producta", "Product A", {
  published: false,
  statusLabel: { en: "Beta", cy: "" },
  colour: "#aabbcc",
})
const live = { ...draft, published: true }
const other = createTestRoadmap("productb", "Product B")
const item = createTestRoadmapItem("First work", { id: "k7q2xw" })
const items = { producta: [item] }

const publish: PublishedStateChange = { published: true }
const unpublish: PublishedStateChange = { published: false }

/** Publishing with these pending edits ("Save and publish", S5). */
function saveAndPublish(changes: RoadmapChanges): PublishedStateChange {
  return { published: true, changes }
}

/** Publishing with "Mark as updated today" ticked (STY-036 S6, D10). */
const publishToday = (
  changes: RoadmapChanges = { roadmap: {}, items: [], newItems: [] },
) => saveAndPublish(markedUpdated(changes, "2026-11-13"))

const twoEdits: RoadmapChanges = {
  roadmap: { statusLabel: change("Beta", "Live") },
  items: [{ item, position: 0, fields: { phase: change("", "Alpha") } }],
  newItems: [],
}

/**
 * Publishing and unpublishing a roadmap (STY-035), as every `RoadmapRepository` does it:
 * called from `describeRoadmapRepositoryContract`.
 */
export function describePublishedState(
  setup: RoadmapRepositoryContractSetup,
): void {
  describe("publishing or unpublishing a roadmap (STY-035)", () => {
    it("publishes a roadmap, writing its published state alone (S2)", async () => {
      const repository = setup.withRoadmaps([draft, other], items)

      await expect(
        repository.setRoadmapPublished(draft, publish),
      ).resolves.toEqual({ status: "set" })
      expect(await repository.listRoadmaps()).toStrictEqual([live, other])
      expect(await repository.listRoadmapItems("producta")).toStrictEqual([
        item,
      ])
    })

    it("publishes a roadmap with today's date, ticked, over a co-lead's, in one write (STY-036 S6, S9)", async () => {
      const theirs = { ...draft, lastUpdated: "2026-11-01" }
      const repository = setup.withRoadmaps([theirs, other], items)

      await expect(
        repository.setRoadmapPublished(draft, publishToday()),
      ).resolves.toEqual({ status: "set" })
      expect(await repository.listRoadmaps()).toStrictEqual([
        { ...live, lastUpdated: "2026-11-13" },
        other,
      ])
    })

    it("still writes today's date, ticked, on a roadmap a co-lead already published (STY-036 D10)", async () => {
      const repository = setup.withRoadmaps([live, other], items)

      await expect(
        repository.setRoadmapPublished(draft, publishToday()),
      ).resolves.toEqual({ status: "set" })
      expect(await repository.listRoadmaps()).toStrictEqual([
        { ...live, lastUpdated: "2026-11-13" },
        other,
      ])
    })

    it("saves and publishes pending edits with today's date, ticked (STY-036 S6)", async () => {
      const repository = setup.withRoadmaps([draft, other], items)

      await expect(
        repository.setRoadmapPublished(draft, publishToday(twoEdits)),
      ).resolves.toEqual({ status: "set" })
      expect(await repository.listRoadmaps()).toStrictEqual([
        {
          ...live,
          statusLabel: { en: "Live", cy: "" },
          lastUpdated: "2026-11-13",
        },
        other,
      ])
    })

    it("unpublishes the only published roadmap, unchecked, even one the sync would fail on (S3, D2)", async () => {
      const repository = setup.withRoadmaps([live], items, {
        syncFaults: { producta: ["short-colour", "no-horizon-column"] },
      })

      await expect(
        repository.setRoadmapPublished(live, unpublish),
      ).resolves.toEqual({ status: "set" })
      expect(await repository.listRoadmaps()).toStrictEqual([draft])
    })

    it("counts a roadmap a co-lead already published as published, writing nothing (D9)", async () => {
      const repository = setup.withRoadmaps([live, other], items, {
        syncFaults: { producta: ["short-colour"] },
      })

      await expect(
        repository.setRoadmapPublished(draft, publish),
      ).resolves.toEqual({ status: "set" })
      expect(await repository.listRoadmaps()).toStrictEqual([live, other])
    })

    it.each([
      [
        "its items' tab is missing",
        { unreadableItems: ["producta"] },
        { code: "items-missing", location: "producta" },
      ],
      [
        "its items have no Title column",
        { syncFaults: { producta: ["no-title-column"] } },
        { code: "items-field-missing", location: "producta", field: "title" },
      ],
      [
        "its items have no Horizon column",
        { syncFaults: { producta: ["no-horizon-column"] } },
        {
          code: "items-field-missing",
          location: "producta",
          field: "placement",
        },
      ],
      [
        "its colour has three digits",
        { syncFaults: { producta: ["short-colour"] } },
        { code: "short-colour", colour: "#abc" },
      ],
    ] as const)(
      "refuses to publish when %s, naming it and writing nothing (S4)",
      async (_case, options, problem) => {
        const repository = setup.withRoadmaps([draft, other], items, options)

        await expect(
          repository.setRoadmapPublished(draft, publish),
        ).resolves.toEqual({ status: "unpublishable", problems: [problem] })
        expect(await repository.listRoadmaps()).toStrictEqual([draft, other])
      },
    )

    it("refuses to publish when another published row has its id, such as a co-lead's (S4, D4)", async () => {
      const theirs = createTestRoadmap("producta", "Product A (live)")
      const repository = setup.withRoadmaps([draft, other], items, {
        twins: [theirs],
      })

      await expect(
        repository.setRoadmapPublished(draft, publish),
      ).resolves.toEqual({
        status: "unpublishable",
        problems: [{ code: "id-taken", title: theirs.title }],
      })
      expect(await repository.listRoadmaps()).toStrictEqual([other, theirs])
    })

    it("names every problem at once (S4)", async () => {
      const theirs = createTestRoadmap("producta", "Product A (live)")
      const repository = setup.withRoadmaps([draft], items, {
        twins: [theirs],
        syncFaults: { producta: ["short-colour", "no-horizon-column"] },
      })

      const outcome = await repository.setRoadmapPublished(draft, publish)

      expect(outcome.status).toBe("unpublishable")
      expect(
        outcome.status === "unpublishable"
          ? outcome.problems.map(({ code }) => code).sort()
          : [],
      ).toEqual(["id-taken", "items-field-missing", "short-colour"])
    })

    it("writes the row the page loaded when another row now shares its id", async () => {
      const first = createTestRoadmap("producta", "Product A draft", {
        published: false,
      })
      const repository = setup.withRoadmaps([first, other], items, {
        twins: [draft],
      })

      await expect(
        repository.setRoadmapPublished(draft, publish),
      ).resolves.toEqual({ status: "set" })
      expect(await repository.listRoadmaps()).toStrictEqual([other, live])
    })

    it("says the roadmap changed when no row holds what was loaded, writing nothing", async () => {
      const theirs = { ...draft, statusLabel: { en: "Alpha", cy: "" } }
      const repository = setup.withRoadmaps([theirs, other], items)

      await expect(
        repository.setRoadmapPublished(draft, publish),
      ).resolves.toEqual({ status: "changed", roadmap: theirs })
      expect(await repository.listRoadmaps()).toStrictEqual([theirs, other])
    })

    it("says the roadmap changed when its row now names another place for its items", async () => {
      const repository = setup.withRoadmaps([draft, other], items)
      const elsewhere = { ...draft, itemsLocation: "product-a" }

      await expect(
        repository.setRoadmapPublished(elsewhere, publish),
      ).resolves.toEqual({ status: "changed", roadmap: draft })
      expect(await repository.listRoadmaps()).toStrictEqual([draft, other])
    })

    it("unpublishes the live row, not a disabled copy of it above (S3)", async () => {
      const repository = setup.withRoadmaps([draft, other], items, {
        twins: [live],
      })

      await expect(
        repository.setRoadmapPublished(live, unpublish),
      ).resolves.toEqual({ status: "set" })
      expect(await repository.listRoadmaps()).toStrictEqual([draft, other])
    })

    it("counts a roadmap a co-lead published as published, though a draft copy of it remains (D9)", async () => {
      const repository = setup.withRoadmaps([live], items, { twins: [draft] })

      await expect(
        repository.setRoadmapPublished(draft, publish),
      ).resolves.toEqual({ status: "set" })
      expect(await repository.listRoadmaps()).toStrictEqual([live])
    })

    it("says a roadmap no longer listed is not found", async () => {
      const repository = setup.withRoadmaps([other])

      await expect(
        repository.setRoadmapPublished(draft, publish),
      ).resolves.toEqual({ status: "roadmap-not-found" })
    })

    describe("with pending edits (Save and publish)", () => {
      it("writes the edits and the published state together (S5)", async () => {
        const repository = setup.withRoadmaps([draft, other], items)

        await expect(
          repository.setRoadmapPublished(draft, saveAndPublish(twoEdits)),
        ).resolves.toEqual({ status: "set" })
        expect(await repository.listRoadmaps()).toStrictEqual([
          { ...live, statusLabel: { en: "Live", cy: "" } },
          other,
        ])
        expect(await repository.listRoadmapItems("producta")).toStrictEqual([
          { ...item, phase: { en: "Alpha", cy: "" } },
        ])
      })

      it("writes nothing on a co-lead's conflicting change (S6)", async () => {
        const theirs = { ...draft, statusLabel: { en: "Alpha", cy: "" } }
        const repository = setup.withRoadmaps([theirs, other], items)

        await expect(
          repository.setRoadmapPublished(draft, saveAndPublish(twoEdits)),
        ).resolves.toEqual({
          status: "refused",
          conflicts: [
            {
              subject: "roadmap",
              field: "statusLabel",
              base: "Beta",
              pending: "Live",
              current: "Alpha",
            },
          ],
          missingItems: [],
        })
        expect(await repository.listRoadmaps()).toStrictEqual([theirs, other])
        expect(await repository.listRoadmapItems("producta")).toStrictEqual([
          item,
        ])
      })

      it("writes nothing when publishing would fail the sync (S4)", async () => {
        const repository = setup.withRoadmaps([draft], items, {
          syncFaults: { producta: ["no-title-column"] },
        })

        await expect(
          repository.setRoadmapPublished(draft, saveAndPublish(twoEdits)),
        ).resolves.toEqual({
          status: "unpublishable",
          problems: [
            {
              code: "items-field-missing",
              location: "producta",
              field: "title",
            },
          ],
        })
        expect(await repository.listRoadmaps()).toStrictEqual([draft])
      })

      it("publishes a three-digit colour that a chosen family replaces (S4)", async () => {
        const family: Family = {
          id: "fc29g5b9",
          name: { en: "Single Record", cy: "" },
          colour: "#12a3c9",
        }
        const repository = setup.withRoadmaps([draft], items, {
          families: [family],
          syncFaults: { producta: ["short-colour"] },
        })

        await expect(
          repository.setRoadmapPublished(
            draft,
            saveAndPublish({
              roadmap: { familyId: change("", family.id) },
              items: [],
              newItems: [],
            }),
          ),
        ).resolves.toEqual({ status: "set" })
        expect(await repository.listRoadmaps()).toStrictEqual([
          createTestRoadmap("producta", "Product A", {
            statusLabel: draft.statusLabel,
            family: family.name,
            familyId: family.id,
            colour: family.colour,
          }),
        ])
      })
    })

    it.each(["forbidden", "unauthenticated"] as const)(
      "rejects with a %s AppError when the write is refused, writing nothing (S8)",
      async (kind) => {
        const repository = setup.withRoadmaps([draft, other], items, {
          write: { fails: kind },
        })

        await expect(
          repository.setRoadmapPublished(draft, saveAndPublish(twoEdits)),
        ).rejects.toMatchObject({ kind, retryable: false })
        expect(await repository.listRoadmaps()).toStrictEqual([draft, other])
        expect(await repository.listRoadmapItems("producta")).toStrictEqual([
          item,
        ])
      },
    )

    it("rejects with the abort reason when the signal is already aborted, writing nothing", async () => {
      const repository = setup.withRoadmaps([draft, other], items)
      const reason = new DOMException("Cancelled by test", "AbortError")

      await expect(
        repository.setRoadmapPublished(draft, publish, {
          signal: AbortSignal.abort(reason),
        }),
      ).rejects.toBe(reason)
      expect(await repository.listRoadmaps()).toStrictEqual([draft, other])
    })

    describe("when the write's answer is lost (S10)", () => {
      it.each([
        ["a publish", publish, [live]],
        ["an unpublish", unpublish, [draft]],
      ] as const)(
        "settles %s as set when a re-read finds it",
        async (_case, asked, after) => {
          const loaded = asked.published ? draft : live
          const repository = setup.withRoadmaps([loaded], items, {
            write: { lost: "applied" },
          })

          await expect(
            repository.setRoadmapPublished(loaded, asked),
          ).resolves.toEqual({ status: "set" })
          expect(await repository.listRoadmaps()).toStrictEqual(after)
        },
      )

      it("settles as set an edit that fills or clears an optional field", async () => {
        const repository = setup.withRoadmaps([draft], items, {
          write: { lost: "applied" },
        })

        await expect(
          repository.setRoadmapPublished(
            draft,
            saveAndPublish({
              roadmap: {
                vision: change("", "Clear"),
                statusLabel: change("Beta", ""),
              },
              items: [],
              newItems: [],
            }),
          ),
        ).resolves.toEqual({ status: "set" })
        expect(await repository.listRoadmaps()).toStrictEqual([
          { ...live, vision: { en: "Clear", cy: "" }, statusLabel: null },
        ])
      })

      it("settles as set a publish with a draft copy below it", async () => {
        const repository = setup.withRoadmaps([draft], items, {
          twins: [draft],
          write: { lost: "applied" },
        })

        await expect(
          repository.setRoadmapPublished(draft, publish),
        ).resolves.toEqual({ status: "set" })
        expect(await repository.listRoadmaps()).toStrictEqual([live])
      })

      it("rejects with a network AppError when a re-read finds none of it", async () => {
        const repository = setup.withRoadmaps([draft], items, {
          write: { lost: "not-applied" },
        })

        await expect(
          repository.setRoadmapPublished(draft, saveAndPublish(twoEdits)),
        ).rejects.toMatchObject({ kind: "network" })
        expect(await repository.listRoadmaps()).toStrictEqual([draft])
      })

      it("is unconfirmed when a re-read finds only some of it", async () => {
        const repository = setup.withRoadmaps([draft], items, {
          write: { lost: "partly-applied" },
        })

        await expect(
          repository.setRoadmapPublished(draft, saveAndPublish(twoEdits)),
        ).resolves.toEqual({ status: "unconfirmed" })
      })

      it("is unconfirmed when the re-read fails", async () => {
        const repository = setup.withRoadmaps([draft], items, {
          write: { lost: "reread-fails" },
        })

        await expect(
          repository.setRoadmapPublished(draft, publish),
        ).resolves.toEqual({ status: "unconfirmed" })
      })
    })
  })
}
