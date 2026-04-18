import { useLang } from '../../../i18n'
import ListingLocationPicker from '../ListingLocationPicker'
import type { SaveListingRequest, ListingLocationData, ListingFieldValidation, AgencyArea } from '../../../types'

interface Props {
  data: SaveListingRequest
  onChange: (patch: Partial<SaveListingRequest>) => void
  validations?: ListingFieldValidation[]
  agencyAreas?: AgencyArea[]
}

export default function Step2Location({ data, onChange, validations, agencyAreas }: Props) {
  const { t } = useLang()
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">{t('s2.heading')}</h2>
      <p className="text-sm text-gray-500">{t('s2.hint')}</p>
      <ListingLocationPicker
        value={data.location ?? {}}
        onChange={loc => onChange({ location: { ...(data.location ?? {}), ...loc } as ListingLocationData })}
        validations={validations}
        agencyAreas={agencyAreas}
      />
    </div>
  )
}
