import { CircleAlertIcon, CircleCheckIcon, InfoIcon } from "lucide-react"
import { useState } from "react"
import type { TFunction } from "i18next"
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
import { useSessionAction } from "@/features/auth/session-action"
import { useLanguage } from "@/i18n"
import { isAppError, type AppErrorKind } from "@/lib/errors"

import { useMatchRoadmap } from "../hooks/use-match-roadmap"
import { writeFailureMessage } from "../write-failure-message"

export interface MatchListsActionProps {
  roadmap: Roadmap
}

type Notice =
  | { kind: "matched"; published: boolean }
  | { kind: "changed" }
  | { kind: "failed"; error: AppErrorKind }

const noticeLook = {
  matched: { variant: "success", Icon: CircleCheckIcon },
  changed: { variant: "info", Icon: InfoIcon },
  failed: { variant: "destructive", Icon: CircleAlertIcon },
} as const

function noticeText(notice: Notice, title: string, t: TFunction): string {
  switch (notice.kind) {
    case "failed":
      return writeFailureMessage(t, "lists", notice.error)
    case "changed":
      return t("roadmaps.lists.match.notice.changed")
    case "matched":
      return t(
        notice.published
          ? "roadmaps.lists.match.notice.matchedPublic"
          : "roadmaps.lists.match.notice.matched",
        { title },
      )
  }
}

/**
 * "Make it match" for a roadmap out of step with its family or category, and what it
 * came to (STY-030). A published roadmap is told the fix goes public at the next nightly
 * update before anything is written (S2); an unpublished one is written at once. Not
 * offered for a family the list doesn't have (S3). Its pending edits are untouched (S4).
 * Pressed after the session has expired, it asks to reconnect first (STY-057).
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
        // The app is held, saying the roadmap may now match (DEF-015).
        if (outcome.status === "unconfirmed") return
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
  const choose = useSessionAction(() => {
    if (roadmap.published) setAsking(true)
    else write()
  })
  const confirm = useSessionAction(write)

  return (
    <div className="flex flex-col gap-4">
      {canMatchLists(roadmap) && (
        <div>
          <Button
            variant="secondary"
            disabled={match.isPending}
            focusableWhenDisabled
            aria-busy={match.isPending}
            onClick={(event) => {
              choose(event.currentTarget)
            }}
          >
            {t("roadmaps.lists.match.action")}
            {/* Names the roadmap for a screen reader, after the visible name. */}{" "}
            <span className="sr-only">{title}</span>
          </Button>
        </div>
      )}
      {roadmap.familyNotListed && (
        <p className="text-body-xs text-muted-foreground">
          {t("roadmaps.lists.match.chooseFamily")}
        </p>
      )}
      {notice && (
        <DismissibleNotice
          role={notice.kind === "failed" ? "alert" : "status"}
          variant={noticeLook[notice.kind].variant}
          Icon={noticeLook[notice.kind].Icon}
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
          <p>{noticeText(notice, title, t)}</p>
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
              onClick={(event) => {
                confirm(event.currentTarget)
              }}
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
