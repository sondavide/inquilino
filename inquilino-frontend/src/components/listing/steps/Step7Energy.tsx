import { useLang } from '../../../i18n'
import type { SaveListingRequest, EnergyClass, ListingFieldValidation } from '../../../types'
import { FieldStatusBadge, FieldNote, fieldBorderClass } from '../FieldStatusBadge'

const ENERGY_CLASSES: { v: EnergyClass; color: string }[] = [
  { v: 'A4', color: 'bg-green-700 text-white' },
  { v: 'A3', color: 'bg-green-600 text-white' },
  { v: 'A2', color: 'bg-green-500 text-white' },
  { v: 'A1', color: 'bg-lime-500 text-white' },
  { v: 'B',  color: 'bg-yellow-400 text-gray-800' },
  { v: 'C',  color: 'bg-yellow-500 text-gray-800' },
  { v: 'D',  color: 'bg-orange-400 text-white' },
  { v: 'E',  color: 'bg-orange-500 text-white' },
  { v: 'F',  color: 'bg-red-500 text-white' },
  { v: 'G',  color: 'bg-red-700 text-white' },
  { v: 'NA', color: 'bg-gray-300 text-gray-700' },
]

interface Props {
  data: SaveListingRequest
  onChange: (patch: Partial<SaveListingRequest>) => void
  validations?: ListingFieldValidation[]
}

export default function Step7Energy({ data, onChange, validations: vs }: Props) {
  const { t } = useLang()
  const energy = data.energy ?? {}
  const upd = (patch: Partial<typeof energy>) =>
    onChange({ energy: { energyCertificateAvailable: false, renewableEnergyPresent: false, ...energy, ...patch } })

  const HEATING_SOURCES = [
    { v: 'gas',              l: t('heatingSource.gas') },
    { v: 'electric',         l: t('heatingSource.electric') },
    { v: 'district_heating', l: t('heatingSource.district_heating') },
    { v: 'biomass',          l: t('heatingSource.biomass') },
    { v: 'other',            l: t('heatingSource.other') },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">{t('s7.heading')}</h2>
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        {t('s7.legalWarning')}
      </p>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          {t('s7.energyClass.label')} <span className="text-red-500">*</span>
          <FieldStatusBadge vs={vs} field="energy.energyCertificate" />
        </label>
        <FieldNote vs={vs} field="energy.energyCertificate" />
        <div className="flex flex-wrap gap-2">
          {ENERGY_CLASSES.map(ec => (
            <button key={ec.v} type="button" onClick={() => upd({ energyClass: ec.v })}
              className={`w-12 h-12 rounded-lg font-bold text-sm transition border-2
                ${energy.energyClass === ec.v
                  ? `${ec.color} border-gray-800 scale-110 shadow-md`
                  : `${ec.color} border-transparent opacity-70 hover:opacity-100`}`}>
              {ec.v}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('s7.epgl.label')} <span className="text-red-500">*</span>
        </label>
        <input type="number" min={0} step="0.01" value={energy.energyIndexEpgl ?? ''}
          onChange={e => upd({ energyIndexEpgl: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldBorderClass(vs, 'energy.energyCertificate')}`} />
        <p className="text-xs text-gray-400 mt-1">{t('s7.epgl.hint')}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('s7.heating.label')}</label>
        <div className="flex flex-wrap gap-2">
          {HEATING_SOURCES.map(h => (
            <button key={h.v} type="button" onClick={() => upd({ heatingEnergySource: h.v })}
              className={`px-3 py-1.5 text-xs rounded-full border-2 transition
                ${energy.heatingEnergySource === h.v
                  ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              {h.l}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={energy.energyCertificateAvailable ?? false}
            onChange={e => upd({ energyCertificateAvailable: e.target.checked })}
            className="rounded border-gray-300 text-blue-600" />
          <span className="text-sm text-gray-700">{t('s7.certAvailable')}</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={energy.renewableEnergyPresent ?? false}
            onChange={e => upd({ renewableEnergyPresent: e.target.checked })}
            className="rounded border-gray-300 text-blue-600" />
          <span className="text-sm text-gray-700">{t('s7.renewable')}</span>
        </label>
      </div>
    </div>
  )
}
