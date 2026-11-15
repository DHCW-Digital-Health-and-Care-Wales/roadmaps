import type { EditFormField, RequiredError } from "./edit-form"

/**
 * An edit form's text fields, in `names`' order, and their values as it opens: `text`
 * gives each value. A field is a text area when `multiline` names it or its text
 * already breaks, and must hold a value when `required` says what to say of it empty.
 */
export function editFormFields<F extends string>(
  names: readonly F[],
  text: (field: F) => string,
  label: (field: F) => string,
  {
    multiline,
    required,
  }: {
    multiline: ReadonlySet<F>
    required: Partial<Record<F, RequiredError>>
  },
): { fields: EditFormField<F>[]; initial: Record<F, string> } {
  const initial = Object.fromEntries(
    names.map((field) => [field, text(field)]),
  ) as Record<F, string>
  const fields = names.map((field) => ({
    name: field,
    label: label(field),
    multiline: multiline.has(field) || initial[field].includes("\n"),
    ...(required[field] && { required: required[field] }),
  }))
  return { fields, initial }
}
