import { LoaderCircleIcon } from "lucide-react"
import { useEffect, useId, useRef, type SubmitEvent } from "react"
import { useTranslation } from "react-i18next"

import { InsetText } from "@/components/layout/inset-text"
import { Button } from "@/components/ui/button"
import { DialogClose, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import {
  SHORT_NAME_MAX_LENGTH,
  shortNameAddress,
} from "@/domain/roadmap/short-name"
import { useAuth } from "@/features/auth/use-auth"

import { FormField } from "../components/form-field"
import { SessionExpiredAlert } from "../components/session-expired-alert"
import { ChoiceField } from "../editing/choice-field"
import { FixedField } from "../editing/fixed-field"
import { useRoadmapChoices } from "../editing/use-roadmap-choices"
import { AddRoadmapFailed } from "./add-roadmap-failed"
import { type RefusableField, useNewRoadmapForm } from "./use-new-roadmap-form"

export interface AddRoadmapFormProps {
  /** The id of the heading naming the form. */
  labelledBy: string
  /** The roadmap list as cached, whose addresses a new short name can't have (D7). */
  roadmaps: readonly Roadmap[]
  onAdded: (roadmap: Roadmap) => void
  /** Closes the dialog, once the answer was lost (DEF-015). */
  onClose: () => void
}

/**
 * The roadmap dialog's adding form (STY-041): a title and a short name, suggested from
 * the title and shown with the public address it gives, then a family, a category and a
 * product lead, each optional. "Add roadmap" writes at once: it shows it is working and
 * holds the fields until the write answers. What can't be sent, or is refused, is said
 * at its field, with focus on the first; a failure, or an expired session with
 * Reconnect, is said above the buttons, where the Product Lead is looking (S11).
 */
export function AddRoadmapForm({
  labelledBy,
  roadmaps,
  onAdded,
  onClose,
}: AddRoadmapFormProps) {
  const { t } = useTranslation()
  const id = useId()
  const { state } = useAuth()
  const connected = state.status === "connected"
  const form = useNewRoadmapForm({ roadmaps, onAdded, onClose })
  const { values, problems, focusRequest, busy } = form
  const choices = useRoadmapChoices(true).fields(null)
  // A list read again, as after a reconnect, may no longer offer what was chosen: the
  // field says so, as when the write finds it gone, rather than send what it can't show.
  const unoffered = choices.fields
    .filter(
      ({ name, options }) =>
        values[name] !== "" &&
        !options?.some(({ value }) => value === values[name]),
    )
    .map(({ name }) => name)
  if (unoffered.length > 0) form.dropChoices(unoffered)

  const controls = useRef(new Map<RefusableField, HTMLElement>())
  const controlRef =
    (field: RefusableField) => (control: HTMLElement | null) => {
      if (control) controls.current.set(field, control)
      else controls.current.delete(field)
    }
  // Again once the field asked for is shown as it is, its list gone: the select that
  // had focus went with the list.
  const requestedIsFixed = choices.fields.some(
    ({ name, fixed }) => name === focusRequest?.field && fixed !== undefined,
  )
  useEffect(() => {
    if (focusRequest) controls.current.get(focusRequest.field)?.focus()
  }, [focusRequest, requestedIsFixed])

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (connected) form.submit()
  }

  const address = shortNameAddress(values.shortName)
  return (
    <form
      aria-labelledby={labelledBy}
      noValidate
      onSubmit={submit}
      className="flex flex-col gap-4"
    >
      <FormField
        id={`${id}-title`}
        label={t("roadmaps.edit.roadmapFields.title")}
        hint={t("roadmaps.add.titleHint")}
        error={problems.title && t("roadmaps.edit.titleRequired")}
      >
        {(control) => (
          <Input
            ref={controlRef("title")}
            value={values.title}
            required
            autoComplete="off"
            // What is being added stays what the form shows.
            readOnly={busy}
            {...control}
            onChange={(event) => {
              form.change("title", event.target.value)
            }}
          />
        )}
      </FormField>
      <FormField
        id={`${id}-shortName`}
        label={t("roadmaps.add.shortName")}
        hint={
          address
            ? t("roadmaps.add.addressHint", { address })
            : t("roadmaps.add.shortNameHint")
        }
        error={
          problems.shortName &&
          t(`roadmaps.add.errors.shortName.${problems.shortName}`, {
            max: SHORT_NAME_MAX_LENGTH,
          })
        }
      >
        {(control) => (
          <Input
            ref={controlRef("shortName")}
            value={values.shortName}
            required
            autoComplete="off"
            spellCheck={false}
            readOnly={busy}
            {...control}
            onChange={(event) => {
              form.change("shortName", event.target.value)
            }}
          />
        )}
      </FormField>
      {choices.fields.map(({ name, label, options, disabled, fixed }) => {
        const error =
          problems[name] && t(`roadmaps.add.errors.notListed.${name}`)
        return options ? (
          <ChoiceField
            key={name}
            ref={controlRef(name)}
            id={`${id}-${name}`}
            label={label}
            options={options}
            value={values[name]}
            disabled={busy || disabled}
            error={error}
            onChange={(value) => {
              form.change(name, value)
            }}
          />
        ) : (
          fixed && (
            <FixedField
              key={name}
              ref={controlRef(name)}
              label={label}
              {...fixed}
              error={error}
            />
          )
        )
      })}
      <FormField
        id={`${id}-productLead`}
        label={t("roadmaps.edit.roadmapFields.productLead")}
      >
        {(control) => (
          <Input
            value={values.productLead}
            autoComplete="off"
            readOnly={busy}
            {...control}
            onChange={(event) => {
              form.change("productLead", event.target.value)
            }}
          />
        )}
      </FormField>
      <InsetText className="py-2 pl-4">
        <p>{t("roadmaps.add.note")}</p>
      </InsetText>
      {!connected ? (
        <SessionExpiredAlert>
          <p>{t("roadmaps.add.expired")}</p>
          {state.status === "expired" && state.lastError && (
            <p>{t(`auth.errors.${state.lastError}`)}</p>
          )}
        </SessionExpiredAlert>
      ) : (
        form.failure && (
          <AddRoadmapFailed
            failure={form.failure}
            onDismiss={form.dismissFailure}
          />
        )
      )}
      <DialogFooter>
        <Button
          type="submit"
          disabled={busy || !connected}
          focusableWhenDisabled
          aria-busy={busy}
        >
          {busy && (
            <LoaderCircleIcon
              data-icon="inline-start"
              aria-hidden="true"
              className="animate-spin"
            />
          )}
          {t("roadmaps.add.submit")}
        </Button>
        <DialogClose type="button" disabled={busy}>
          {t("common.cancel")}
        </DialogClose>
      </DialogFooter>
    </form>
  )
}
