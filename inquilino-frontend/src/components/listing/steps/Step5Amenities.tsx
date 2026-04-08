import { useLang } from '../../../i18n'
import type { SaveListingRequest, ListingFeaturesData, ListingFieldValidation } from '../../../types'

interface Props {
  data: SaveListingRequest
  onChange: (patch: Partial<SaveListingRequest>) => void
  validations?: ListingFieldValidation[]
}

function SelectButtons({ label, options, value, onChange, required }: {
  label: string; options: { v: string; l: string }[]; value?: string;
  onChange: (v: string) => void; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map(o => (
          <button key={o.v} type="button" onClick={() => onChange(o.v)}
            className={`px-3 py-1.5 text-xs rounded-full border-2 transition
              ${value === o.v
                ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
            {o.l}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Step5Amenities({ data, onChange }: Props) {
  const { t } = useLang()
  const avail = data.availability ?? {}
  const feats = data.features ?? {} as Partial<ListingFeaturesData>
  const amenities = feats.amenities ?? {}

  const updAvail = (patch: Record<string, unknown>) =>
    onChange({ availability: { petsAllowed: false, smokingAllowed: false, childrenAllowed: true, sublettingAllowed: false, residenceAllowed: true, studentsAllowed: true, workersAllowed: true, shortStayAllowed: false, ...avail, ...patch } })

  const updAmenity = (key: string, val: boolean) => {
    const newAmenities = { ...amenities, [key]: val }
    onChange({ features: { elevator: false, parkingSpacesCount: 0, garageIncluded: false, balconiesCount: 0, terracesCount: 0, cellarsCount: 0, studentsOnly: false, ...feats, amenities: newAmenities } })
  }

  const CONDITION_STATUS = [
    { v: 'new',        l: t('condition.new') },
    { v: 'excellent',  l: t('condition.excellent') },
    { v: 'renovated',  l: t('condition.renovated') },
    { v: 'good',       l: t('condition.good') },
    { v: 'habitable',  l: t('condition.habitable') },
    { v: 'to_restore', l: t('condition.to_restore') },
  ]

  const FURNISHED_STATUS = [
    { v: 'furnished',           l: t('furnished.furnished') },
    { v: 'partially_furnished', l: t('furnished.partially') },
    { v: 'unfurnished',         l: t('furnished.unfurnished') },
  ]

  const HEATING_TYPES = [
    { v: 'centralized', l: t('heatingType.centralized') },
    { v: 'autonomous',  l: t('heatingType.autonomous') },
    { v: 'heat_pump',   l: t('heatingType.heat_pump') },
    { v: 'none',        l: t('heatingType.none') },
    { v: 'other',       l: t('heatingType.other') },
  ]

  const AMENITY_GROUPS = [
    { labelKey: 'amenityGroup.climate',        items: [{ key: 'air_conditioning', labelKey: 'amenity.air_conditioning' }] },
    { labelKey: 'amenityGroup.connectivity',   items: [{ key: 'internet_available', labelKey: 'amenity.internet_available' }, { key: 'fiber_available', labelKey: 'amenity.fiber_available' }, { key: 'tv', labelKey: 'amenity.tv' }] },
    { labelKey: 'amenityGroup.appliances',     items: [{ key: 'washing_machine', labelKey: 'amenity.washing_machine' }, { key: 'dishwasher', labelKey: 'amenity.dishwasher' }, { key: 'dryer', labelKey: 'amenity.dryer' }, { key: 'oven', labelKey: 'amenity.oven' }, { key: 'microwave', labelKey: 'amenity.microwave' }, { key: 'refrigerator', labelKey: 'amenity.refrigerator' }, { key: 'freezer', labelKey: 'amenity.freezer' }] },
    { labelKey: 'amenityGroup.security',       items: [{ key: 'security_door', labelKey: 'amenity.security_door' }, { key: 'alarm_system', labelKey: 'amenity.alarm_system' }, { key: 'concierge', labelKey: 'amenity.concierge' }] },
    { labelKey: 'amenityGroup.outdoor',        items: [{ key: 'private_garden', labelKey: 'amenity.private_garden' }, { key: 'shared_garden', labelKey: 'amenity.shared_garden' }, { key: 'pool', labelKey: 'amenity.pool' }, { key: 'gym', labelKey: 'amenity.gym' }] },
    { labelKey: 'amenityGroup.accessibility',  items: [{ key: 'wheelchair_accessible', labelKey: 'amenity.wheelchair_accessible' }, { key: 'disabled_bathroom', labelKey: 'amenity.disabled_bathroom' }] },
  ] as const

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">{t('s5.heading')}</h2>

      <SelectButtons label={t('s5.condition.label')} options={CONDITION_STATUS}
        value={avail.conditionStatus} onChange={v => updAvail({ conditionStatus: v })} required />

      <SelectButtons label={t('s5.furnished.label')} options={FURNISHED_STATUS}
        value={avail.furnishedStatus} onChange={v => updAvail({ furnishedStatus: v })} required />

      <SelectButtons label={t('s5.heating.label')} options={HEATING_TYPES}
        value={avail.heatingType} onChange={v => updAvail({ heatingType: v })} />

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('s5.amenities.heading')}</h3>
        <div className="space-y-4">
          {AMENITY_GROUPS.map(group => (
            <div key={group.labelKey}>
              <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                {t(group.labelKey)}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {group.items.map(item => (
                  <label key={item.key}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition
                      ${amenities[item.key]
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    <input type="checkbox" checked={amenities[item.key] ?? false}
                      onChange={e => updAmenity(item.key, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600" />
                    <span className="text-xs">{t(item.labelKey)}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
