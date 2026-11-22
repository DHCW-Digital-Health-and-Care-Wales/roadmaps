import { PlusIcon, TriangleAlertIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { DismissibleNotice } from "@/components/layout/dismissible-notice"
import { Button } from "@/components/ui/button"
import { familyMembers } from "@/domain/roadmap/family-changes"
import type { Family } from "@/domain/roadmap/family"
import type { Roadmap } from "@/domain/roadmap/roadmap"

import { useFamilyWriting } from "../hooks/use-family-changes"
import { AddFamilyForm } from "./add-family-form"
import { ChangeFamilyForm } from "./change-family-form"
import { FamilyEntry } from "./family-entry"
import { FamilyOutcomeNotice, type FamilyNotice } from "./family-outcome-notice"

const ADD_ID = "families-add"

export interface FamiliesSectionProps {
  /** `null` without a usable family list (S7). */
  families: readonly Family[] | null
  roadmaps: readonly Roadmap[]
}

/**
 * Which form is open, one at a time, with the list as it was when it opened, so a
 * refresh that drops the family or the list never unmounts a form mid-write.
 */
type Editing =
  | { kind: "add"; families: readonly Family[] }
  | { kind: "change"; family: Family; families: readonly Family[] }
  | null

function changeId(family: Family): string {
  return `family-change-${family.id}`
}

/**
 * The families (S1), each with Change, then Add, one form open at a time; without a
 * usable list, a note that they can't be changed (S7). Focus returns to the control a
 * form opened from, or moves to the notice of what it did.
 */
export function FamiliesSection({ families, roadmaps }: FamiliesSectionProps) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState<Editing>(null)
  const [notice, setNotice] = useState<FamilyNotice | null>(null)
  // A request to move focus once a form closes: to a control by id, or to the notice.
  const [focusRequest, setFocusRequest] = useState<{ id: string } | null>(null)
  const noticeRef = useRef<HTMLDivElement>(null)
  // No new form while a write is under way, or without a usable list (S7).
  const locked = useFamilyWriting() || families === null
  const listed = families ?? editing?.families ?? null
  const shown =
    listed !== null &&
    editing?.kind === "change" &&
    !listed.some(({ id }) => id === editing.family.id)
      ? [...listed, editing.family]
      : listed

  useEffect(() => {
    if (focusRequest === null) return
    if (focusRequest.id === "notice") noticeRef.current?.focus()
    else document.getElementById(focusRequest.id)?.focus()
  }, [focusRequest])

  const open = (next: NonNullable<Editing>) => {
    if (locked) return
    setNotice(null)
    setEditing(next)
  }
  const close = (done: FamilyNotice | null, returnTo: string) => {
    setEditing(null)
    setNotice(done)
    setFocusRequest({ id: done ? "notice" : returnTo })
  }

  return (
    <section aria-labelledby="families-heading" className="flex flex-col gap-4">
      <h2 id="families-heading" className="text-heading-l">
        {t("roadmaps.families.heading")}
      </h2>
      {notice && (
        <FamilyOutcomeNotice
          ref={noticeRef}
          notice={notice}
          onDismiss={() => {
            setNotice(null)
          }}
        />
      )}
      {families === null && (
        <DismissibleNotice
          role="note"
          variant="warning"
          Icon={TriangleAlertIcon}
          title={t("roadmaps.families.unavailable.title")}
          className="max-w-2xl"
        >
          <p>{t("roadmaps.families.unavailable.description")}</p>
        </DismissibleNotice>
      )}
      {shown !== null && (
        <>
          <ul className="flex flex-col gap-4">
            {shown.map((family) => (
              <li
                key={family.id}
                className="border bg-card p-4 text-card-foreground"
              >
                {editing?.kind === "change" &&
                editing.family.id === family.id ? (
                  <ChangeFamilyForm
                    family={editing.family}
                    families={shown}
                    roadmaps={roadmaps}
                    available={families !== null}
                    onDone={(done) => {
                      close(done, changeId(family))
                    }}
                  />
                ) : (
                  <FamilyEntry
                    family={family}
                    roadmaps={familyMembers(roadmaps, family.id)}
                    changeId={changeId(family)}
                    disabled={locked}
                    onChange={() => {
                      open({ kind: "change", family, families: shown })
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
          {editing?.kind === "add" ? (
            <AddFamilyForm
              families={shown}
              available={families !== null}
              onAdded={(done) => {
                close(done, ADD_ID)
              }}
              onCancel={() => {
                close(null, ADD_ID)
              }}
            />
          ) : (
            <div>
              <Button
                id={ADD_ID}
                variant="secondary"
                disabled={locked}
                onClick={() => {
                  open({ kind: "add", families: shown })
                }}
              >
                <PlusIcon data-icon="inline-start" aria-hidden="true" />
                {t("roadmaps.families.add")}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
