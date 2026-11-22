import { act, screen } from "@testing-library/react"
import type userEvent from "@testing-library/user-event"

import { editItemText } from "./item-dialog"

/** Opens a roadmap and changes the title of its one item, so it has a pending change. */
export async function change(
  user: ReturnType<typeof userEvent.setup>,
  router: { navigate: (options: { to: string }) => Promise<void> },
  roadmapId: string,
  item: string,
) {
  await act(() => router.navigate({ to: `/roadmaps/${roadmapId}` }))
  await screen.findByRole("heading", { level: 3, name: item })
  await editItemText(user, item, "Title", `${item}, edited`)
}
