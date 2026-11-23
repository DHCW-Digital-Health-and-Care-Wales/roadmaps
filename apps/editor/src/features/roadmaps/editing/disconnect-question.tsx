import { Link } from "@tanstack/react-router"
import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { MAIN_ID } from "@/components/layout/main-landmark"
import { textLinkClasses } from "@/components/layout/text-link-classes"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { localise } from "@/domain/roadmap/localised-text"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { useLanguage } from "@/i18n"
import { isPlainClick } from "@/lib/plain-click"

import { useRoadmaps } from "../hooks/use-roadmaps"
import { useDisconnectQuestion } from "./disconnect-question-context"
import { usePendingChanges } from "./pending-changes-context"

/** The roadmaps with changes, and how many there are. */
interface ChangedRoadmaps {
  count: number
  /** Those of them the roadmap list holds, none while it is unread. */
  roadmaps: readonly Roadmap[]
}

/**
 * The roadmaps with changes while the question `open`, following them as a read drops
 * one; once it closes, what it showed, so its text does not change as it fades.
 */
function useChangedRoadmaps(open: boolean): {
  shown: ChangedRoadmaps
  current: ChangedRoadmaps
} {
  const { changes } = usePendingChanges()
  const { data: listed } = useRoadmaps()
  const current = useMemo(
    () => ({
      count: changes.size,
      roadmaps: (listed ?? []).filter(({ id }) => changes.has(id)),
    }),
    [changes, listed],
  )
  const [shown, setShown] = useState(current)
  if (open && shown !== current) setShown(current)
  return { shown, current }
}

/**
 * Disconnect with pending edits: keep them for the next connection, discard, or stay. It
 * names each roadmap with changes, as a link to it (STY-055 D2); choosing one closes the
 * question, leaving the changes and the connection as they are, and moves focus to the
 * page it opens. Should a read leave nothing to keep while it is open, it disconnects, as
 * Disconnect does at once with nothing pending.
 */
export function DisconnectQuestion() {
  const { t } = useTranslation()
  const language = useLanguage()
  const { open, onKeep, onDiscard, onCancel } = useDisconnectQuestion()
  const { shown, current } = useChangedRoadmaps(open)
  const chosenRef = useRef(false)
  useEffect(() => {
    if (open) chosenRef.current = false
  }, [open])
  const nothingToKeep = open && current.count === 0
  useEffect(() => {
    if (nothingToKeep) onKeep()
  }, [nothingToKeep, onKeep])
  const { count, roadmaps } = shown
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
      onOpenChangeComplete={(opened) => {
        if (!opened && chosenRef.current) {
          document.getElementById(MAIN_ID)?.focus({ preventScroll: true })
        }
      }}
    >
      <AlertDialogContent
        // Back to Disconnect, unless a link was chosen: then focus goes to the page it
        // opens once this has closed, as the router's own move of focus could not reach
        // it while this was modal, and Base UI would carry on to its first control.
        finalFocus={() => !chosenRef.current}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{t("roadmaps.disconnect.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("roadmaps.disconnect.description", {
              count,
            })}
          </AlertDialogDescription>
          {roadmaps.length > 0 && (
            <ul
              aria-label={t("layout.navigation.unpublished", { count })}
              className="list-disc ps-5 text-body"
            >
              {roadmaps.map((roadmap) => (
                <li key={roadmap.id}>
                  <Link
                    to="/roadmaps/$roadmapId"
                    params={{ roadmapId: roadmap.id }}
                    className={textLinkClasses}
                    onClick={(event) => {
                      if (!isPlainClick(event)) return
                      chosenRef.current = true
                      onCancel()
                    }}
                  >
                    {localise(roadmap.title, language)}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button onClick={onKeep}>{t("roadmaps.disconnect.keep")}</Button>
          <Button variant="destructive" onClick={onDiscard}>
            {t("roadmaps.disconnect.discard")}
          </Button>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
