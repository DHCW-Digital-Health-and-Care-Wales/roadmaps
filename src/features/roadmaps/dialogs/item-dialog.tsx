import { useTranslation } from "react-i18next"

import { EditItemForm, type EditItemFormProps } from "./edit-item-form"
import { FormDialog, type FormDialogProps } from "./form-dialog"

export type ItemDialogProps = Omit<EditItemFormProps, "labelledBy"> &
  Pick<FormDialogProps, "open" | "onClose" | "opener">

/**
 * The item dialog (EPC-011): where an item is edited, in place of its card turning into
 * a form (STY-044). It closes as `FormDialog` sets.
 */
export function ItemDialog({
  open,
  onClose,
  opener,
  ...form
}: ItemDialogProps) {
  const { t } = useTranslation()
  return (
    <FormDialog
      open={open}
      title={t("roadmaps.edit.itemHeading")}
      onClose={onClose}
      opener={opener}
    >
      {(titleId) => <EditItemForm labelledBy={titleId} {...form} />}
    </FormDialog>
  )
}
