import { useTranslation } from "react-i18next"

export interface FieldErrorProps {
  /** For the `aria-describedby` of what the message is about. */
  id: string
  /** What is wrong, as an instruction. */
  children: string
}

/** What is wrong with a form's field, said at the field. */
export function FieldError({ id, children }: FieldErrorProps) {
  const { t } = useTranslation()
  return (
    <p id={id} className="font-bold text-destructive">
      <span className="sr-only">{t("roadmaps.edit.errorPrefix")}</span>{" "}
      {children}
    </p>
  )
}
