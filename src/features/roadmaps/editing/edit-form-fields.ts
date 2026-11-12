import type { EditFormField } from "./edit-form"

/**
 * An edit form's fields, in `names`' order, and their values as it opens: `text` gives
 * each value, and a field is a text area when `multiline` names it or its text already
 * breaks.
 */
export function editFormFields<F extends string>(
  names: readonly F[],
  text: (field: F) => string,
  label: (field: F) => string,
  multiline: ReadonlySet<F>,
): { fields: EditFormField<F>[]; initial: Record<F, string> } {
  const initial = Object.fromEntries(
    names.map((field) => [field, text(field)]),
  ) as Record<F, string>
  const fields = names.map((field) => ({
    name: field,
    label: label(field),
    multiline: multiline.has(field) || initial[field].includes("\n"),
  }))
  return { fields, initial }
}
