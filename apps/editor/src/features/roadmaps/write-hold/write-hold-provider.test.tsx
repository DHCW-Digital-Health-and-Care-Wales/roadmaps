import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import { connected } from "@/test/connected-state"
import { renderHookWithProviders } from "@/test/render-with-providers"

import { holdCall } from "../testing/held-call"
import { createInMemoryRoadmapRepository } from "../testing/in-memory-roadmap-repository"
import { expectWriteHold } from "../testing/write-hold"
import { useWriteHold } from "./write-hold-context"
import type { WriteHoldRequest } from "./write-hold-store"

describe("WriteHoldProvider", () => {
  it("reads again before it ends when a write is held during a Refresh (DEF-015 S3)", async () => {
    const user = userEvent.setup()
    const base = createInMemoryRoadmapRepository()
    const roadmapsRead = holdCall(base.listRoadmaps.bind(base))
    const listRoadmaps = vi
      .fn(base.listRoadmaps.bind(base))
      .mockImplementationOnce(roadmapsRead.held)
    const listFamilies = vi.fn(base.listFamilies.bind(base))
    const { result } = renderHookWithProviders(() => useWriteHold(), {
      authState: connected,
      repository: { ...base, listRoadmaps, listFamilies },
    })

    const ended: string[] = []
    const holdFor = (request: WriteHoldRequest) => {
      act(() => {
        void result.current(request).then(() => ended.push(request.write))
      })
    }

    holdFor({ write: "matched", landed: false, reads: ["roadmaps"] })
    const hold = await expectWriteHold(
      "The roadmap may now match its family and category",
    )
    await user.click(within(hold).getByRole("button", { name: "Refresh" }))
    await waitFor(() => {
      expect(roadmapsRead.held).toHaveBeenCalled()
    })

    holdFor({ write: "family", landed: false, reads: ["families", "roadmaps"] })
    await act(async () => {
      roadmapsRead.release()
      await roadmapsRead.released
    })

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).toBeNull()
    })
    expect(listFamilies).toHaveBeenCalled()
    expect(listRoadmaps).toHaveBeenCalledTimes(2)
    expect(ended).toEqual(["matched", "family"])
  })
})
