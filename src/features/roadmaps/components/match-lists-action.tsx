import { CircleAlertIcon, CircleCheckIcon, InfoIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { DismissibleNotice } from "@/components/layout/dismissible-notice"
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
import { canMatchLists, type MatchOutcome } from "@/domain/roadmap/list-match"
import { localise } from "@/domain/roadmap/localised-text"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { useLanguage } from "@/i18n"
import { isAppError, type AppErrorKind } from "@/lib/errors"

import { useMatchRoadmap } from "../hooks/use-match-roadmap"

export interface MatchListsActionProps {
  roadmap: Roadmap
}

type Notice =
  | { kind: "matched"; published: boolean }
  | { kind: "changed" }
  | { kind: "failed"; error: AppErrorKind }

/**
 * "Make it match" for a roadmap out of step with its family or category, and what it
 * came to (STY-030). A published roadmap is told the fix goes public at the next nightly
 * update before anything is written (S2); an unpublished one is written at once. Not
 * offered for a family the list doesn't have (S3). Its pending edits are untouched (S4).
 */
export function MatchListsAction({ roadmap }: MatchListsActionProps) {
  const { t } = useTranslation()
  const language = useLanguage()
  const match = useMatchRoadmap()
  const [asking, setAsking] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const title = localise(roadmap.title, language)

  const write = () => {
    setNotice(null)
    match.mutate(roadmap, {
      onSuccess: (outcome: MatchOutcome) => {
        setNotice(
          outcome.status === "matched"
            ? { kind: "matched", published: roadmap.published }
            : { kind: "changed" },
        )
      },
      onError: (error) => {
        setNotice({
          kind: "failed",
          error: isAppError(error) ? error.kind : "unknown",
        })
      },
      onSettled: () => {
        setAsking(false)
      },
    })
  }
  const choose = () => {
    if (roadmap.published) setAsking(true)
    else write()
  }

  return (
    <div className="flex flex-col gap-4">
      {canMatchLists(roadmap) && (
        <div>
          <Button
            variant="secondary"
            disabled={match.isPending}
            focusableWhenDisabled
            aria-busy={match.isPending}
            onClick={choose}
          >
            {t("roadmaps.lists.match.action")}
            {/* Names the roadmap for a screen reader, after the visible name. */}{" "}
            <span className="sr-only">{title}</span>
          </Button>
        </div>
      )}
      {notice && (
        <DismissibleNotice
          role={notice.kind === "failed" ? "alert" : "status"}
          variant={
            notice.kind === "failed"
              ? "destructive"
              : notice.kind === "changed"
                ? "info"
                : "success"
          }
          Icon={
            notice.kind === "failed"
              ? CircleAlertIcon
              : notice.kind === "changed"
                ? InfoIcon
                : CircleCheckIcon
          }
          title={
            notice.kind === "failed"
              ? t("roadmaps.lists.match.notice.failed")
              : null
          }
          onDismiss={() => {
            setNotice(null)
          }}
          className="max-w-2xl"
        >
          <p>
            {notice.kind === "failed"
              ? t(`roadmaps.lists.match.errors.${notice.error}`)
              : notice.kind === "changed"
                ? t("roadmaps.lists.match.notice.changed")
                : t(
                    notice.published
                      ? "roadmaps.lists.match.notice.matchedPublic"
                      : "roadmaps.lists.match.notice.matched",
                    { title },
                  )}
          </p>
        </DismissibleNotice>
      )}
      <AlertDialog
        open={asking}
        onOpenChange={(next) => {
          if (!next && !match.isPending) setAsking(false)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("roadmaps.lists.match.confirm.title", { title })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("roadmaps.lists.match.confirm.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              disabled={match.isPending}
              focusableWhenDisabled
              aria-busy={match.isPending}
              onClick={write}
            >
              {t("roadmaps.lists.match.confirm.action")}
            </Button>
            <AlertDialogCancel disabled={match.isPending}>
              {t("common.cancel")}
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
