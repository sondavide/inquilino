import { useLang } from '../../../i18n'
import type { SaveListingRequest, ListingPriceData, ListingFieldValidation } from '../../../types'
import { FieldStatusBadge, FieldNote, fieldBorderClass } from '../FieldStatusBadge'

interface Props {
  data: SaveListingRequest
  onChange: (patch: Partial<SaveListingRequest>) => void
  validations?: ListingFieldValidation[]
}

function MoneyInput({ label, value, onChange, required, hint }: {
  label: string; value?: number; onChange: (v: number | undefined) => void;
  required?: boolean; hint?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <span className="absolute left-3 top-2 text-gray-400 text-sm">€</span>
        <input type="number" min={0} step="0.01" value={value ?? ''}
          onChange={e => onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))}
          className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm
                     focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

export default function Step3Price({ data, onChange, validations: vs }: Props) {
  const { t } = useLang()
  const price = data.price ?? {} as Partial<ListingPriceData>
  const update = (patch: Partial<ListingPriceData>) =>
    onChange({ price: { currency: 'EUR', utilitiesIncluded: false, priceVisibility: 'public', ...price, ...patch } })

  const isShortTerm = data.listingType === 'SHORT_TERM_RENT'

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-800">{t('s3.heading')}</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('s3.monthlyRent')} {!isShortTerm && <span className="text-red-500">*</span>}
            <FieldStatusBadge vs={vs} field="price.monthlyRent" />
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-400 text-sm">€</span>
            <input type="number" min={0} step="0.01" value={price.monthlyRent ?? ''}
              onChange={e => update({ monthlyRent: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
              className={`w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldBorderClass(vs, 'price.monthlyRent')}`} />
          </div>
          <FieldNote vs={vs} field="price.monthlyRent" />
        </div>
        {isShortTerm && (
          <MoneyInput label={t('s3.dailyRent')} value={price.dailyRent} onChange={v => update({ dailyRent: v })} />
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('s3.condoFees')}
            <FieldStatusBadge vs={vs} field="price.condominiumFees" />
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-gray-400 text-sm">€</span>
            <input type="number" min={0} step="0.01" value={price.condominiumFees ?? ''}
              onChange={e => update({ condominiumFees: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
              className={`w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldBorderClass(vs, 'price.condominiumFees')}`} />
          </div>
          <FieldNote vs={vs} field="price.condominiumFees" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input type="checkbox" id="util" checked={price.utilitiesIncluded ?? false}
          onChange={e => update({ utilitiesIncluded: e.target.checked })}
          className="rounded border-gray-300 text-blue-600" />
        <label htmlFor="util" className="text-sm text-gray-700">{t('s3.utilitiesIncluded')}</label>
      </div>
      {price.utilitiesIncluded && (
        <MoneyInput label={t('s3.utilitiesEstimate')} value={price.utilitiesEstimatedMonthly}
          onChange={v => update({ utilitiesEstimatedMonthly: v })} />
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('s3.depositMonths')}</label>
          <input type="number" min={0} max={12} value={price.depositMonths ?? ''}
            onChange={e => update({ depositMonths: e.target.value === '' ? undefined : parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <MoneyInput label={t('s3.depositAmount')} value={price.depositAmount}
          onChange={v => update({ depositAmount: v })} hint={t('s3.depositHint')} />
      </div>

      {data.publisherType === 'AGENCY' && (
        <div className="space-y-3 bg-yellow-50 rounded-lg p-3 border border-yellow-100">
          <p className="text-xs font-medium text-yellow-800">{t('s3.agencyFee.heading')}</p>
          <MoneyInput label={t('s3.agencyFee.amount')} value={price.agencyFeeAmount}
            onChange={v => update({ agencyFeeAmount: v })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('s3.agencyFee.notes')}</label>
            <input type="text" value={price.agencyFeeNotes ?? ''} onChange={e => update({ agencyFeeNotes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('s3.priceVisibility.label')}</label>
        <div className="flex gap-3">
          {[
            { v: 'public',   l: t('s3.priceVisibility.public') },
            { v: 'reserved', l: t('s3.priceVisibility.reserved') },
          ].map(opt => (
            <button key={opt.v} type="button" onClick={() => update({ priceVisibility: opt.v })}
              className={`flex-1 py-2 text-sm rounded-lg border-2 transition
                ${(price.priceVisibility ?? 'public') === opt.v
                  ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              {opt.l}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
