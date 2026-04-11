import { useLang } from '../../../i18n'
import type { SaveListingRequest, ListingAvailabilityData, ListingFieldValidation } from '../../../types'
import { FieldStatusBadge, FieldNote, fieldBorderClass } from '../FieldStatusBadge'

interface Props {
  data: SaveListingRequest
  onChange: (patch: Partial<SaveListingRequest>) => void
  validations?: ListingFieldValidation[]
}

function BoolToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition
      ${value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)}
        className="rounded border-gray-300 text-blue-600" />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )
}

export default function Step6Availability({ data, onChange, validations: vs }: Props) {
  const { t } = useLang()
  const avail = data.availability ?? {}
  const upd = (patch: Partial<ListingAvailabilityData>) =>
    onChange({ availability: { petsAllowed: false, smokingAllowed: false, childrenAllowed: true, sublettingAllowed: false, residenceAllowed: true, studentsAllowed: true, workersAllowed: true, shortStayAllowed: false, ...avail, ...patch } })

  const isShortTerm = data.listingType === 'SHORT_TERM_RENT'

  const AVAIL_STATUS = [
    { v: 'available_now',       l: t('availStatus.available_now') },
    { v: 'available_from_date', l: t('availStatus.available_from_date') },
    { v: 'rented',              l: t('availStatus.rented') },
    { v: 'reserved',            l: t('availStatus.reserved') },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">{t('s6.heading')}</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('s6.availStatus.label')} <span className="text-red-500">*</span>
          <FieldStatusBadge vs={vs} field="availability.availabilityStatus" />
        </label>
        <FieldNote vs={vs} field="availability.availabilityStatus" />
        <div className="grid grid-cols-2 gap-2">
          {AVAIL_STATUS.map(o => (
            <button key={o.v} type="button" onClick={() => {
              const patch: Partial<ListingAvailabilityData> = { availabilityStatus: o.v }
              if (o.v === 'available_now') patch.availableFrom = new Date().toISOString().split('T')[0]
              upd(patch)
            }}
              className={`p-2.5 text-sm rounded-lg border-2 transition
                ${avail.availabilityStatus === o.v
                  ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              {o.l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('s6.availableFrom.label')}
          {avail.availabilityStatus === 'available_from_date' && <span className="text-red-500"> *</span>}
          <FieldStatusBadge vs={vs} field="availability.availableFrom" />
        </label>
        <input
          type="date"
          value={avail.availableFrom ?? ''}
          onChange={e => upd({ availableFrom: e.target.value })}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldBorderClass(vs, 'availability.availableFrom')}`}
        />
        <FieldNote vs={vs} field="availability.availableFrom" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {isShortTerm ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('s6.minStayDays')}</label>
              <input type="number" min={1} value={avail.minimumStayDays ?? ''} onChange={e => upd({ minimumStayDays: e.target.value === '' ? undefined : parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('s6.maxStayDays')}</label>
              <input type="number" min={1} value={avail.maximumStayDays ?? ''} onChange={e => upd({ maximumStayDays: e.target.value === '' ? undefined : parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('s6.minContractMonths')}</label>
              <input type="number" min={1} value={avail.minimumContractDurationMonths ?? ''} onChange={e => upd({ minimumContractDurationMonths: e.target.value === '' ? undefined : parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('s6.maxOccupants')}</label>
              <input type="number" min={1} value={avail.maxOccupants ?? ''} onChange={e => upd({ maxOccupants: e.target.value === '' ? undefined : parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">{t('s6.rules.heading')}</h3>
        <div className="grid grid-cols-2 gap-2">
          <BoolToggle label={t('s6.petsAllowed')}       value={avail.petsAllowed ?? false}      onChange={v => upd({ petsAllowed: v })} />
          <BoolToggle label={t('s6.smokingAllowed')}    value={avail.smokingAllowed ?? false}   onChange={v => upd({ smokingAllowed: v })} />
          <BoolToggle label={t('s6.childrenAllowed')}   value={avail.childrenAllowed ?? true}   onChange={v => upd({ childrenAllowed: v })} />
          <BoolToggle label={t('s6.residenceAllowed')}  value={avail.residenceAllowed ?? true}  onChange={v => upd({ residenceAllowed: v })} />
          <BoolToggle label={t('s6.studentsAllowed')}   value={avail.studentsAllowed ?? true}   onChange={v => upd({ studentsAllowed: v })} />
          <BoolToggle label={t('s6.workersAllowed')}    value={avail.workersAllowed ?? true}    onChange={v => upd({ workersAllowed: v })} />
          <BoolToggle label={t('s6.sublettingAllowed')} value={avail.sublettingAllowed ?? false} onChange={v => upd({ sublettingAllowed: v })} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{t('s6.notesLabel')}</label>
        <textarea value={avail.notesForTenants ?? ''} onChange={e => upd({ notesForTenants: e.target.value })}
          rows={3} placeholder={t('s6.notesPlaceholder')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </div>
    </div>
  )
}
