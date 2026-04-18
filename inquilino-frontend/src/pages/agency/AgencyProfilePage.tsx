import { useEffect, useState } from 'react'
import { getAgencyProfile, updateAgencyProfile } from '@/api/agency'
import type { AgencyProfileDto, AgencyArea } from '@/types'
import AgencyAreaMap from './AgencyAreaMap'
import { useLang } from '@/i18n'

export default function AgencyProfilePage() {
  const { t } = useLang()
  const [profile, setProfile] = useState<AgencyProfileDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError]     = useState('')

  const [form, setForm] = useState({
    agencyName: '', vatNumber: '', reaNumber: '',
    websiteUrl: '', contactEmail: '', contactPhone: '',
  })
  const [areas, setAreas] = useState<AgencyArea[]>([])

  useEffect(() => {
    getAgencyProfile()
      .then(p => {
        setProfile(p)
        setForm({
          agencyName: p.agencyName ?? '', vatNumber: p.vatNumber ?? '',
          reaNumber: p.reaNumber ?? '', websiteUrl: p.websiteUrl ?? '',
          contactEmail: p.contactEmail ?? '', contactPhone: p.contactPhone ?? '',
        })
        setAreas(p.areas ?? [])
      })
      .catch(() => setError(t('agency.profile.error_load')))
      .finally(() => setLoading(false))
  }, [])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(''); setSuccess('')
    try {
      const updated = await updateAgencyProfile(form)
      setProfile(updated)
      setSuccess(t('agency.profile.saved'))
      setTimeout(() => setSuccess(''), 3000)
    } catch { setError(t('agency.profile.error_save')) }
    finally { setSaving(false) }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-full text-muted-foreground text-sm py-12">{t('agency.profile.loading')}</div>
  )

  return (
    <div className="px-4 py-6 w-full space-y-6">

      {/* Status banner */}
      {profile && profile.status !== 'ACTIVE' && (
        <div className={`rounded-xl px-4 py-3 text-sm border ${
          profile.status === 'PENDING_APPROVAL'
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {profile.status === 'PENDING_APPROVAL' && (
            <><strong>{t('agency.profile.pending_banner')}</strong></>
          )}
          {profile.status === 'SUSPENDED' && (
            <><strong>{t('agency.profile.suspended_banner')}</strong>
            {profile.statusNote && <span> {t('agency.profile.suspended_reason', { reason: profile.statusNote })}</span>}</>
          )}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">{success}</div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {/* Profilo */}
      <section className="bg-card border rounded-2xl p-5">
        <h2 className="font-semibold text-base mb-4">{t('agency.profile.title')}</h2>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('agency.profile.corporate_name')} <span className="text-red-500">*</span></label>
            <input required type="text" value={form.agencyName}
              onChange={e => setForm(p => ({ ...p, agencyName: e.target.value }))}
              className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">{t('agency.profile.vat')}</label>
              <input type="text" value={form.vatNumber}
                onChange={e => setForm(p => ({ ...p, vatNumber: e.target.value }))}
                className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('agency.profile.rea')}</label>
              <input type="text" value={form.reaNumber}
                onChange={e => setForm(p => ({ ...p, reaNumber: e.target.value }))}
                className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('agency.profile.website')}</label>
            <input type="url" value={form.websiteUrl}
              onChange={e => setForm(p => ({ ...p, websiteUrl: e.target.value }))}
              placeholder="https://" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">{t('agency.profile.contact_email')}</label>
              <input type="email" value={form.contactEmail}
                onChange={e => setForm(p => ({ ...p, contactEmail: e.target.value }))}
                className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('agency.profile.phone')}</label>
              <input type="tel" value={form.contactPhone}
                onChange={e => setForm(p => ({ ...p, contactPhone: e.target.value }))}
                className={inputCls} />
            </div>
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition">
            {saving ? t('agency.profile.saving') : t('agency.profile.save')}
          </button>
        </form>
      </section>

      {/* Aree di pertinenza — sola lettura */}
      <section className="bg-card border rounded-2xl p-5">
        <h2 className="font-semibold text-base mb-1">{t('agency.areas.title')}</h2>
        <p className="text-xs text-muted-foreground mb-4">{t('agency.areas.readonly_note')}</p>

        <AgencyAreaMap areas={areas} />

        {areas.length > 0 && (
          <ul className="mt-3 space-y-2">
            {areas.map((a, i) => (
              <li key={i} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 text-sm">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${
                  a.type === 'COMUNE' ? 'bg-blue-100 text-blue-700'
                  : a.type === 'PROVINCIA' ? 'bg-amber-100 text-amber-700'
                  : 'bg-green-100 text-green-700'
                }`}>{t(`agency.areas.type.${a.type}` as any)}</span>
                <span className="flex-1 truncate">{a.displayName}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-background'
