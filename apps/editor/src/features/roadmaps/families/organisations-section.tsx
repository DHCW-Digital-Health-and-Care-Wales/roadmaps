import { useTranslation } from "react-i18next"

import { localise } from "@/domain/roadmap/localised-text"
import type { Organisation } from "@/domain/roadmap/organisation"
import { useLanguage } from "@/i18n"

import { FieldName } from "../components/field-name"
import { sortOrganisations } from "../sort-organisations"

/**
 * The organisations an item can be for, each by full name and code, read-only (STY-033):
 * they can't be changed here. All Wales first, then by the full name in the interface's
 * language (ADR-014).
 */
export function OrganisationsSection({
  organisations,
}: {
  organisations: readonly Organisation[]
}) {
  const { t } = useTranslation()
  const language = useLanguage()
  const fullName = ({ name }: Organisation) => localise(name, language)
  return (
    <section
      aria-labelledby="organisations-heading"
      className="flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <h2 id="organisations-heading" className="text-heading-l">
          <FieldName field="organisations">
            {t("roadmaps.families.organisations.heading")}
          </FieldName>
        </h2>
        <p className="text-muted-foreground">
          {t("roadmaps.families.organisations.description")}
        </p>
      </div>
      {organisations.length > 0 ? (
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          {sortOrganisations(organisations, fullName, language).map(
            (organisation) => (
              <li key={organisation.id}>
                {t("roadmaps.families.organisations.entry", {
                  name: fullName(organisation),
                  code: organisation.code,
                })}
              </li>
            ),
          )}
        </ul>
      ) : (
        <p>{t("roadmaps.families.organisations.none")}</p>
      )}
    </section>
  )
}
