import { useLang } from '../../../i18n'
import type { SaveListingRequest, ListingMediaItem } from '../../../types'

interface Props {
  data: SaveListingRequest
  media: ListingMediaItem[]
  onGoToStep: (step: number) => void
}

function ReviewRow({ label, value, step, onGoToStep, error, editLabel }: {
  label: string; value?: string | null; step: number;
  onGoToStep: (s: number) => void; error?: boolean; editLabel: string
}) {
  return (
    <div className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0">
      <div>
        <span className={`text-sm ${error ? 'text-red-600 font-medium' : 'text-gray-600'}`}>{label}</span>
        {value && <p className="text-sm text-gray-800 mt-0.5">{value}</p>}
        {!value && <p className="text-xs text-red-500 mt-0.5">⚠ Non compilato</p>}
      </div>
      <button type="button" onClick={() => onGoToStep(step)}
        className="text-xs text-blue-600 hover:underline ml-4 shrink-0">
        {editLabel}
      </button>
    </div>
  )
}

export default function Step10Review({ data, media, onGoToStep }: Props) {
  const { t } = useLang()
  const images = media.filter(m => m.mediaType === 'IMAGE')

  const LISTING_TYPE_LABELS: Record<string, string> = {
    LONG_TERM_RENT:    t('listingType.LONG_TERM_RENT'),
    SHORT_TERM_RENT:   t('listingType.SHORT_TERM_RENT'),
    TRANSITIONAL_RENT: t('listingType.TRANSITIONAL_RENT'),
    STUDENT_RENT:      t('listingType.STUDENT_RENT'),
    ROOM_RENT:         t('listingType.ROOM_RENT'),
  }

  const PROPERTY_TYPE_LABELS: Record<string, string> = {
    APARTMENT:         t('propertyType.APARTMENT'),
    STUDIO:            t('propertyType.STUDIO'),
    LOFT:              t('propertyType.LOFT'),
    PENTHOUSE:         t('propertyType.PENTHOUSE'),
    HOUSE:             t('propertyType.HOUSE'),
    VILLA:             t('propertyType.VILLA'),
    ROOM:              t('propertyType.ROOM'),
    BED_IN_SHARED_ROOM: t('propertyType.BED_IN_SHARED_ROOM'),
  }

  const errors: string[] = []
  if (!data.listingType)  errors.push(t('s11.error.listingType'))
  if (!data.propertyType) errors.push(t('s11.error.propertyType'))
  if (!data.title || data.title.length < 15) errors.push(t('s11.error.title'))
  if (!data.description || data.description.length < 50) errors.push(t('s11.error.description'))
  if (!data.location?.lat) errors.push(t('s11.error.location'))
  if (!data.price?.monthlyRent && data.listingType !== 'SHORT_TERM_RENT') errors.push(t('s11.error.monthlyRent'))
  if (!data.availability?.availabilityStatus) errors.push(t('s11.error.availability'))
  if (!data.energy?.energyClass) errors.push(t('s11.error.energyClass'))
  if (!data.energy?.energyIndexEpgl) errors.push(t('s11.error.epgl'))
  if (images.length === 0) errors.push(t('s11.error.photos'))

  const isReady = errors.length === 0
  const editLabel = t('s11.edit')

  const row = (label: string, value: string | undefined | null, step: number, error?: boolean) => (
    <ReviewRow key={label} label={label} value={value} step={step}
      onGoToStep={onGoToStep} error={error} editLabel={editLabel} />
  )

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-800">{t('s11.heading')}</h2>

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-red-700 mb-2">{t('s11.errors.heading')}</p>
          <ul className="list-disc list-inside space-y-1">
            {errors.map(e => <li key={e} className="text-sm text-red-600">{e}</li>)}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
        <div className="px-4 py-3">
          {row(t('s11.row.listingType'),
            data.listingType ? `${LISTING_TYPE_LABELS[data.listingType] ?? data.listingType} · ${PROPERTY_TYPE_LABELS[data.propertyType ?? ''] ?? data.propertyType}` : undefined,
            0, !data.listingType)}
          {row(t('s11.row.title'), data.title, 0, !data.title)}
          {row(t('s11.row.location'), data.location?.fullAddress ?? data.location?.municipality, 1, !data.location?.lat)}
          {row(t('s11.row.monthlyRent'),
            data.price?.monthlyRent ? `€ ${data.price.monthlyRent.toLocaleString('it-IT')}` : undefined,
            2, !data.price?.monthlyRent && data.listingType !== 'SHORT_TERM_RENT')}
          {row(t('s11.row.surface'),
            data.features?.surfaceSqm ? `${data.features.surfaceSqm} m²` : undefined, 3)}
          {row(t('s11.row.availability'), data.availability?.availabilityStatus, 5, !data.availability?.availabilityStatus)}
          {row(t('s11.row.energyClass'), data.energy?.energyClass, 6, !data.energy?.energyClass)}
          {row(t('s11.row.photos'),
            images.length > 0 ? t('s11.photoCount', { n: String(images.length) }) : undefined,
            7, images.length === 0)}
        </div>
      </div>

      {isReady ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700">
          {t('s11.ready')}
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-600">
          {t('s11.draft')}
        </div>
      )}
    </div>
  )
}
