import { useLang } from '../../../i18n'
import type { SaveListingRequest, ListingFeaturesData, ListingFieldValidation } from '../../../types'
import { FieldStatusBadge, FieldNote, fieldBorderClass } from '../FieldStatusBadge'

interface Props {
  data: SaveListingRequest
  onChange: (patch: Partial<SaveListingRequest>) => void
  validations?: ListingFieldValidation[]
}

function NumField({ label, value, onChange, required }: {
  label: string; value?: number; onChange: (v: number | undefined) => void; required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input type="number" min={0} value={value ?? ''}
        onChange={e => onChange(e.target.value === '' ? undefined : parseInt(e.target.value))}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  )
}

function VField({ label, fieldName, value, onChange, required, vs }: {
  label: string; fieldName: string; value?: number; onChange: (v: number | undefined) => void;
  required?: boolean; vs?: ListingFieldValidation[]
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}{required && <span className="text-red-500">*</span>}
        <FieldStatusBadge vs={vs} field={fieldName} />
      </label>
      <input type="number" min={0} value={value ?? ''}
        onChange={e => onChange(e.target.value === '' ? undefined : parseInt(e.target.value))}
        className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldBorderClass(vs, fieldName)}`} />
      <FieldNote vs={vs} field={fieldName} />
    </div>
  )
}

function BoolField({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)}
        className="rounded border-gray-300 text-blue-600" />
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )
}

export default function Step4Features({ data, onChange, validations: vs }: Props) {
  const { t } = useLang()
  const f = data.features ?? {} as Partial<ListingFeaturesData>
  const upd = (patch: Partial<ListingFeaturesData>) =>
    onChange({ features: { elevator: false, parkingSpacesCount: 0, garageIncluded: false, balconiesCount: 0, terracesCount: 0, cellarsCount: 0, studentsOnly: false, amenities: {}, ...f, ...patch } })

  const isRoom = data.propertyType === 'ROOM' || data.propertyType === 'BED_IN_SHARED_ROOM'

  const FLOOR_OPTIONS = [
    { value: -2, label: t('floor.basement2') },
    { value: -1, label: t('floor.basement1') },
    { value:  0, label: t('floor.ground') },
    ...Array.from({ length: 30 }, (_, i) => ({ value: i + 1, label: t('floor.n', { n: String(i + 1) }) })),
  ]

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-800">{t('s4.heading')}</h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <VField
          label={isRoom ? t('s4.roomSurface') : t('s4.surface')}
          fieldName="features.surfaceSqm"
          value={isRoom ? f.roomSurfaceSqm : f.surfaceSqm}
          onChange={v => upd(isRoom ? { roomSurfaceSqm: v } : { surfaceSqm: v })}
          required vs={vs}
        />
        {!isRoom && (
          <VField label={t('s4.rooms')} fieldName="features.roomsCount" value={f.roomsCount}
            onChange={v => upd({ roomsCount: v })} vs={vs} />
        )}
        <NumField label={t('s4.bedrooms')} value={f.bedroomsCount} onChange={v => upd({ bedroomsCount: v })} />
        <VField label={t('s4.bathrooms')} fieldName="features.bathroomsCount" value={f.bathroomsCount}
          onChange={v => upd({ bathroomsCount: v })} required={!isRoom} vs={vs} />

        {/* Piano */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('s4.floor')}
            <FieldStatusBadge vs={vs} field="features.floorNumber" />
          </label>
          <select value={f.floorNumber ?? ''} onChange={e => upd({ floorNumber: e.target.value === '' ? undefined : parseInt(e.target.value) })}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white ${fieldBorderClass(vs, 'features.floorNumber')}`}>
            <option value="">—</option>
            {FLOOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <FieldNote vs={vs} field="features.floorNumber" />
        </div>

        <NumField label={t('s4.totalFloors')} value={f.totalBuildingFloors}
          onChange={v => upd({ totalBuildingFloors: v })} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-gray-50 rounded-lg p-3">
        <BoolField label={t('s4.elevator')} value={f.elevator ?? false} onChange={v => upd({ elevator: v })} />
        <BoolField label={t('s4.garageIncluded')} value={f.garageIncluded ?? false} onChange={v => upd({ garageIncluded: v })} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <NumField label={t('s4.balconies')} value={f.balconiesCount} onChange={v => upd({ balconiesCount: v ?? 0 })} />
        <NumField label={t('s4.terraces')}  value={f.terracesCount}  onChange={v => upd({ terracesCount: v ?? 0 })} />
        <NumField label={t('s4.cellars')}   value={f.cellarsCount}   onChange={v => upd({ cellarsCount: v ?? 0 })} />
      </div>
      {f.garageIncluded && (
        <NumField label={t('s4.parking')} value={f.parkingSpacesCount} onChange={v => upd({ parkingSpacesCount: v ?? 0 })} />
      )}

      {isRoom && (
        <div className="space-y-3 bg-blue-50 rounded-lg p-3 border border-blue-100">
          <p className="text-xs font-medium text-blue-800">{t('s4.roomSection')}</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('s4.roomType.label')}</label>
            <div className="flex gap-2">
              {[
                { v: 'single',     l: t('s4.roomType.single') },
                { v: 'double',     l: t('s4.roomType.double') },
                { v: 'shared_bed', l: t('s4.roomType.sharedBed') },
              ].map(o => (
                <button key={o.v} type="button" onClick={() => upd({ roomType: o.v })}
                  className={`flex-1 py-2 text-xs rounded-lg border-2 transition
                    ${f.roomType === o.v ? 'border-blue-600 bg-blue-100 text-blue-700 font-medium' : 'border-gray-200 text-gray-600'}`}>
                  {o.l}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <BoolField label={t('s4.privateBathroom')} value={f.privateBathroom ?? false} onChange={v => upd({ privateBathroom: v })} />
            <BoolField label={t('s4.sharedBathroom')}  value={f.sharedBathroom ?? false}  onChange={v => upd({ sharedBathroom: v })} />
            <BoolField label={t('s4.sharedKitchen')}   value={f.sharedKitchen ?? false}   onChange={v => upd({ sharedKitchen: v })} />
            <BoolField label={t('s4.studentsOnly')}    value={f.studentsOnly ?? false}    onChange={v => upd({ studentsOnly: v })} />
          </div>
          <NumField label={t('s4.roommates')} value={f.roommatesCount} onChange={v => upd({ roommatesCount: v })} />
        </div>
      )}
    </div>
  )
}
