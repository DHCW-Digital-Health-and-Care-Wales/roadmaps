import { BuildingComplexIcon, TagIcon } from "lucide-react"
import type { ReactNode } from "react"

/**
 * The fields whose name carries an icon, by the names a field goes by: an item's tags,
 * and its organisations on a card (`organisations`) or in a form and a review
 * (`organisationIds`). Every other field's name stays plain (STY-079 D3).
 */
const ICONS = {
  tags: TagIcon,
  organisations: BuildingComplexIcon,
  organisationIds: BuildingComplexIcon,
} as const

function isIconField(field: string): field is keyof typeof ICONS {
  return Object.hasOwn(ICONS, field)
}

export interface FieldNameProps {
  /** The field the name is of, which chooses its icon: none for most fields. */
  field?: string | undefined
  /** The name, as the catalogue words it. */
  children: ReactNode
}

/**
 * A field's name, with the field's icon before it when it has one (STY-079): hidden
 * from assistive technology, so the name reads as it did, the name's colour and as
 * tall as its text, centred on the line, the icon and the name wrapping together.
 */
export function FieldName({ field, children }: FieldNameProps) {
  if (field === undefined || !isIconField(field)) return children
  const Icon = ICONS[field]
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon aria-hidden="true" className="size-[1em] shrink-0" />
      <span>{children}</span>
    </span>
  )
}
