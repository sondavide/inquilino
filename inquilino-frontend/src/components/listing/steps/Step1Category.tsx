import { useLang } from '../../../i18n'
import type { SaveListingRequest, ListingFieldValidation } from '../../../types'
import { FieldStatusBadge, FieldNote, fieldBorderClass } from '../FieldStatusBadge'

interface Props {
  data: SaveListingRequest
  onChange: (patch: Partial<SaveListingRequest>) => void
  validations?: ListingFieldValidation[]
}

export default function Step1Category({ data, onChange, validations: vs }: Props) {
  const { t } = useLang()

  const LISTING_TYPES = [
    { value: 'LONG_TERM_RENT',    label: t('listingType.LONG_TERM_RENT') },
    { value: 'SHORT_TERM_RENT',   label: t('listingType.SHORT_TERM_RENT') },
    { value: 'TRANSITIONAL_RENT', label: t('listingType.TRANSITIONAL_RENT') },
    { value: 'STUDENT_RENT',      label: t('listingType.STUDENT_RENT') },
    { value: 'ROOM_RENT',         label: t('listingType.ROOM_RENT') },
  ]

  const PROPERTY_TYPES = [
    { value: 'APARTMENT',          label: t('propertyType.APARTMENT') },
    { value: 'STUDIO',             label: t('propertyType.STUDIO') },
    { value: 'LOFT',               label: t('propertyType.LOFT') },
    { value: 'PENTHOUSE',          label: t('propertyType.PENTHOUSE') },
    { value: 'HOUSE',              label: t('propertyType.HOUSE') },
    { value: 'VILLA',              label: t('propertyType.VILLA') },
    { value: 'ROOM',               label: t('propertyType.ROOM') },
    { value: 'BED_IN_SHARED_ROOM', label: t('propertyType.BED_IN_SHARED_ROOM') },
    { value: 'OFFICE',             label: t('propertyType.OFFICE') },
    { value: 'GARAGE',             label: t('propertyType.GARAGE') },
    { value: 'OTHER',              label: t('propertyType.OTHER') },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">{t('s1.heading')}</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('s1.listingType.label')} <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {LISTING_TYPES.map(tp => (
            <button key={tp.value} type="button" onClick={() => onChange({ listingType: tp.value })}
              className={`p-3 text-left text-sm rounded-lg border-2 transition
                ${data.listingType === tp.value
                  ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
              {tp.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('s1.propertyType.label')} <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PROPERTY_TYPES.map(tp => (
            <button key={tp.value} type="button" onClick={() => onChange({ propertyType: tp.value })}
              className={`p-3 text-center text-sm rounded-lg border-2 transition
                ${data.propertyType === tp.value
                  ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
              {tp.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('s1.titleLabel')} <span className="text-red-500">*</span>
          <FieldStatusBadge vs={vs} field="title" />
        </label>
        <input type="text" value={data.title ?? ''} onChange={e => onChange({ title: e.target.value })}
          maxLength={120} placeholder={t('s1.titlePlaceholder')}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldBorderClass(vs, 'title')}`} />
        <p className="text-xs text-gray-400 mt-1">{t('s1.titleHint', { count: String((data.title ?? '').length) })}</p>
        <FieldNote vs={vs} field="title" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('s1.descLabel')} <span className="text-red-500">*</span>
          <FieldStatusBadge vs={vs} field="description" />
        </label>
        <textarea value={data.description ?? ''} onChange={e => onChange({ description: e.target.value })}
          rows={5} maxLength={10000} placeholder={t('s1.descPlaceholder')}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${fieldBorderClass(vs, 'description')}`} />
        <p className="text-xs text-gray-400 mt-1">{t('s1.descHint', { count: String((data.description ?? '').length) })}</p>
        <FieldNote vs={vs} field="description" />
      </div>
    </div>
  )
}
