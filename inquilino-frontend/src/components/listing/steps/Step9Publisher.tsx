import { useLang } from '../../../i18n'
import type { SaveListingRequest, ListingPublisherData, ListingFieldValidation } from '../../../types'
import { FieldStatusBadge, FieldNote, fieldBorderClass } from '../FieldStatusBadge'

interface Props {
  data: SaveListingRequest
  onChange: (patch: Partial<SaveListingRequest>) => void
  validations?: ListingFieldValidation[]
}

export default function Step9Publisher({ data, onChange, validations: vs }: Props) {
  const { t } = useLang()
  const pub = data.publisher ?? {} as Partial<ListingPublisherData>
  const upd = (patch: Partial<ListingPublisherData>) => onChange({ publisher: { ...pub, ...patch } })

  const isAgency = data.publisherType === 'AGENCY' || data.publisherType === 'BUILDER' || data.publisherType === 'PROPERTY_MANAGER'
  const needPhone = pub.contactMode === 'phone' || pub.contactMode === 'mixed'
  const needEmail = pub.contactMode === 'email' || pub.contactMode === 'mixed'

  const CONTACT_MODES = [
    { v: 'platform_only', l: t('contactMode.platform_only'), d: t('contactMode.platform_only.desc') },
    { v: 'phone',         l: t('contactMode.phone'),         d: t('contactMode.phone.desc') },
    { v: 'email',         l: t('contactMode.email'),         d: t('contactMode.email.desc') },
    { v: 'mixed',         l: t('contactMode.mixed'),         d: t('contactMode.mixed.desc') },
  ]

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-800">{t('s10.heading')}</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('s10.displayName.label')} <span className="text-red-500">*</span>
          <FieldStatusBadge vs={vs} field="publisher.displayName" />
        </label>
        <input type="text" value={pub.displayName ?? ''} onChange={e => upd({ displayName: e.target.value })}
          placeholder={isAgency ? t('s10.placeholder.agency') : t('s10.placeholder.private')}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldBorderClass(vs, 'publisher.displayName')}`} />
        <FieldNote vs={vs} field="publisher.displayName" />
      </div>

      {isAgency && (
        <div className="space-y-4 bg-blue-50 rounded-lg p-4 border border-blue-100">
          <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">{t('s10.agencySection')}</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('s10.agencyName')} <span className="text-red-500">*</span>
            </label>
            <input type="text" value={pub.agencyName ?? ''} onChange={e => upd({ agencyName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('s10.vatNumber')}</label>
              <input type="text" value={pub.vatNumber ?? ''} onChange={e => upd({ vatNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('s10.rea')}</label>
              <input type="text" value={pub.reaNumber ?? ''} onChange={e => upd({ reaNumber: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('s10.website')}</label>
            <input type="url" value={pub.websiteUrl ?? ''} onChange={e => upd({ websiteUrl: e.target.value })}
              placeholder="https://"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('s10.contactMode.label')} <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {CONTACT_MODES.map(cm => (
            <button key={cm.v} type="button" onClick={() => upd({ contactMode: cm.v })}
              className={`p-3 text-left rounded-lg border-2 transition
                ${pub.contactMode === cm.v ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className={`text-sm font-medium ${pub.contactMode === cm.v ? 'text-blue-700' : 'text-gray-700'}`}>{cm.l}</div>
              <div className="text-xs text-gray-400 mt-0.5">{cm.d}</div>
            </button>
          ))}
        </div>
      </div>

      {needPhone && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('s10.phone.label')} <span className="text-red-500">*</span>
            <FieldStatusBadge vs={vs} field="publisher.contact" />
          </label>
          <input type="tel" value={pub.contactPhone ?? ''} onChange={e => upd({ contactPhone: e.target.value })}
            placeholder="+39 "
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldBorderClass(vs, 'publisher.contact')}`} />
          <FieldNote vs={vs} field="publisher.contact" />
        </div>
      )}

      {needEmail && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('s10.email.label')} <span className="text-red-500">*</span>
            <FieldStatusBadge vs={vs} field="publisher.contact" />
          </label>
          <input type="email" value={pub.contactEmail ?? ''} onChange={e => upd({ contactEmail: e.target.value })}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${fieldBorderClass(vs, 'publisher.contact')}`} />
          <FieldNote vs={vs} field="publisher.contact" />
        </div>
      )}
    </div>
  )
}
