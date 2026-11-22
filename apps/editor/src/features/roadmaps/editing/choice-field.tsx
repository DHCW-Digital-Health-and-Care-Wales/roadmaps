import type { Ref } from "react"

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"

import { FormField } from "../components/form-field"
import { RoadmapSwatch } from "../components/roadmap-swatch"

/** One choice of a field chosen from a list. */
export interface ChoiceOption {
  value: string
  label: string
  /** Its colour, shown beside the field while it is chosen; `null` for none. */
  colour?: string | null
  /** Shown while the value is none, but never chosen (STY-031 S4). */
  disabled?: boolean
}

export interface ChoiceFieldProps {
  id: string
  label: string
  /** The choices, in this order. */
  options: readonly ChoiceOption[]
  value: string
  /** Held at its value, as while its options are read or a write is under way. */
  disabled?: boolean | undefined
  error?: string | undefined
  ref?: Ref<HTMLSelectElement>
  onChange: (value: string) => void
}

/**
 * A field chosen from a list (STY-028): a select, with the chosen option's colour beside
 * it when the options have colours.
 */
export function ChoiceField({
  id,
  label,
  options,
  value,
  disabled,
  error,
  ref,
  onChange,
}: ChoiceFieldProps) {
  const chosen = options.find((option) => option.value === value)
  const coloured = options.some(({ colour }) => colour !== undefined)
  return (
    <FormField id={id} label={label} error={error}>
      {(control) => (
        <div className="flex items-stretch gap-2.5">
          {coloured && <RoadmapSwatch colour={chosen?.colour ?? null} />}
          <NativeSelect
            ref={ref}
            value={value}
            disabled={disabled}
            {...control}
            onChange={(event) => {
              onChange(event.target.value)
            }}
          >
            {options.map((option) => (
              <NativeSelectOption
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      )}
    </FormField>
  )
}
