import { Link } from "@tanstack/react-router"
import { use, useEffect, useRef } from "react"
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
import { useLanguage } from "@/i18n"
import { isPlainClick } from "@/lib/plain-click"

import { DisconnectQuestionContext } from "./disconnect-question-context"

/**
 * Disconnect with pending edits: keep them for the next connection, discard, or stay. It
 * names each roadmap with changes, as a link to it (STY-055 D2); choosing one closes the
 * question, leaving the changes and the connection as they are, and moves focus to the
 * page it opens.
 */
export function DisconnectQuestion() {
  const { t } = useTranslation()
  const language = useLanguage()
  const question = use(DisconnectQuestionContext)
  const chosen = useRef(false)
  const open = question?.open === true
  useEffect(() => {
    if (open) chosen.current = false
  }, [open])
  if (!question) return null

  const { count, roadmaps, onKeep, onDiscard, onCancel } = question
  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
      onOpenChangeComplete={(opened) => {
        if (!opened && chosen.current) {
          document.getElementById(MAIN_ID)?.focus({ preventScroll: true })
        }
      }}
    >
      <AlertDialogContent
        // Back to Disconnect, unless a link was chosen: then focus goes to the page it
        // opens once this has closed, as the router's own move of focus could not reach
        // it while this was modal, and Base UI would carry on to its first control.
        finalFocus={() => !chosen.current}
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
                      chosen.current = true
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
