import { useQuery } from "@tanstack/react-query"
import { LockKeyholeIcon, PlusIcon, TriangleAlertIcon } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"

import { BackLink } from "@/components/layout/back-link"
import { DismissibleNotice } from "@/components/layout/dismissible-notice"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import type { Category } from "@/domain/roadmap/category"
import { familyMembers } from "@/domain/roadmap/family-changes"
import type { Family } from "@/domain/roadmap/family"
import { localise } from "@/domain/roadmap/localised-text"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import { AuthButton } from "@/features/auth/components/auth-button"
import { useAuth } from "@/features/auth/use-auth"
import { useLanguage } from "@/i18n"

import { RefreshButton } from "../components/refresh-button"
import { RoadmapsErrorState } from "../components/roadmaps-error-state"
import { StatusPanel } from "../components/status-panel"
import { AddFamilyForm } from "../families/add-family-form"
import { ChangeFamilyForm } from "../families/change-family-form"
import { FamilyEntry } from "../families/family-entry"
import {
  FamilyOutcomeNotice,
  type FamilyNotice,
} from "../families/family-outcome-notice"
import { useEnabledWhileConnected } from "../hooks/enabled-while-connected"
import {
  categoryListQueryOptions,
  familyListQueryOptions,
} from "../hooks/roadmap-queries"
import { useRoadmaps } from "../hooks/use-roadmaps"
import { useRoadmapsProblem } from "../hooks/use-roadmaps-problem"
import { useRoadmapRepository } from "../roadmap-repository-context"

const TITLE_ID = "families-title"
const ADD_ID = "families-add"

/**
 * `/families`: each family with its colour, names and roadmaps, which anyone connected
 * can add to, rename or recolour, and the categories, read-only (STY-029). Handles not
 * connected, loading and failure, as the roadmap list does.
 */
export function FamiliesPage() {
  const { t } = useTranslation()
  const repository = useRoadmapRepository()
  const connected = useAuth().state.status === "connected"
  const roadmaps = useRoadmaps()
  const families = useQuery(
    useEnabledWhileConnected(familyListQueryOptions(repository)),
  )
  const categories = useQuery(
    useEnabledWhileConnected(categoryListQueryOptions(repository)),
  )
  const queries = [roadmaps, families, categories]
  const fetching = queries.some(({ isFetching }) => isFetching)
  const problem = useRoadmapsProblem(
    queries.find(({ error }) => error !== null)?.error ?? null,
  )
  const reload = () => {
    for (const query of queries) void query.refetch()
  }

  const content = (() => {
    if (
      roadmaps.data !== undefined &&
      families.data !== undefined &&
      categories.data !== undefined
    ) {
      return (
        <>
          {problem && (
            <RoadmapsErrorState
              variant="alert"
              subject="families"
              error={problem}
              onRetry={reload}
              retrying={fetching}
            />
          )}
          <FamiliesSection
            families={families.data}
            roadmaps={roadmaps.data}
            available={connected}
          />
          <CategoriesSection categories={categories.data} />
        </>
      )
    }
    if (!connected && queries.every(({ data }) => data === undefined)) {
      return (
        <StatusPanel
          icon={<LockKeyholeIcon />}
          title={t("roadmaps.families.title")}
          description={t("roadmaps.families.connectPrompt")}
          action={<AuthButton />}
        />
      )
    }
    if (problem) {
      return (
        <RoadmapsErrorState
          variant="panel"
          subject="families"
          error={problem}
          onRetry={reload}
          retrying={fetching}
        />
      )
    }
    return (
      <div role="status">
        <span className="sr-only">{t("roadmaps.families.loading")}</span>
        <div aria-hidden="true" className="flex flex-col gap-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    )
  })()

  return (
    <section aria-labelledby={TITLE_ID}>
      <BackLink to="/">{t("roadmaps.detail.back")}</BackLink>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <h1 id={TITLE_ID} className="text-heading-xl">
            {t("roadmaps.families.title")}
          </h1>
          <p className="text-pretty text-muted-foreground">
            {t("roadmaps.families.description")}
          </p>
        </div>
        <div className="shrink-0">
          <RefreshButton fetching={fetching} onRefresh={reload} />
        </div>
      </div>
      <div className="mt-8 flex flex-col gap-10">{content}</div>
    </section>
  )
}

interface FamiliesSectionProps {
  /** `null` without a usable family list (S7). */
  families: readonly Family[] | null
  roadmaps: readonly Roadmap[]
  available: boolean
}

/** Which form is open: one at a time. */
type Editing = { kind: "add" } | { kind: "change"; family: Family } | null

function changeId(family: Family): string {
  return `family-change-${family.id}`
}

function FamiliesSection({
  families,
  roadmaps,
  available,
}: FamiliesSectionProps) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState<Editing>(null)
  const [notice, setNotice] = useState<FamilyNotice | null>(null)
  // A request to move focus once a form closes: to a control by id, or to the notice.
  const [focusRequest, setFocusRequest] = useState<{ id: string } | null>(null)
  const noticeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (focusRequest === null) return
    if (focusRequest.id === "notice") noticeRef.current?.focus()
    else document.getElementById(focusRequest.id)?.focus()
  }, [focusRequest])

  const open = (next: NonNullable<Editing>) => {
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
      {families === null ? (
        <DismissibleNotice
          role="note"
          variant="warning"
          Icon={TriangleAlertIcon}
          title={t("roadmaps.families.unavailable.title")}
          className="max-w-2xl"
        >
          <p>{t("roadmaps.families.unavailable.description")}</p>
        </DismissibleNotice>
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {families.map((family) => (
              <li
                key={family.id}
                className="border bg-card p-4 text-card-foreground"
              >
                {editing?.kind === "change" &&
                editing.family.id === family.id ? (
                  <ChangeFamilyForm
                    family={editing.family}
                    families={families}
                    roadmaps={roadmaps}
                    available={available}
                    onDone={(done) => {
                      close(done, changeId(family))
                    }}
                  />
                ) : (
                  <FamilyEntry
                    family={family}
                    roadmaps={familyMembers(roadmaps, family.id)}
                    changeId={changeId(family)}
                    onChange={() => {
                      open({ kind: "change", family })
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
          {editing?.kind === "add" ? (
            <AddFamilyForm
              families={families}
              available={available}
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
                onClick={() => {
                  open({ kind: "add" })
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

function CategoriesSection({
  categories,
}: {
  categories: readonly Category[] | null
}) {
  const { t } = useTranslation()
  const language = useLanguage()
  return (
    <section
      aria-labelledby="categories-heading"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <h2 id="categories-heading" className="text-heading-l">
          {t("roadmaps.families.categories.heading")}
        </h2>
        <p className="text-muted-foreground">
          {t("roadmaps.families.categories.description")}
        </p>
      </div>
      {categories && categories.length > 0 ? (
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          {categories.map((category) => (
            <li key={category.id}>{localise(category.name, language)}</li>
          ))}
        </ul>
      ) : (
        <p>{t("roadmaps.families.categories.none")}</p>
      )}
    </section>
  )
}
