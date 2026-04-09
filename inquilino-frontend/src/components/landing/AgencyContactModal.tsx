import { useState } from 'react'
import { X, Send, CheckCircle, AlertCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { sendAgencyContact } from '@/api/landing'
import { useLang } from '@/i18n'

interface Props {
  onClose: () => void
}

export default function AgencyContactModal({ onClose }: Props) {
  const { t } = useLang()
  const [form, setForm] = useState({ name: '', email: '', agencyName: '', city: '', message: '' })
  // Honeypot: must remain empty — if filled, it's a bot
  const [honeypot, setHoneypot]   = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle')
  const [errors, setErrors] = useState<Partial<typeof form>>({})

  const upd = (k: keyof typeof form, v: string) => {
    setForm(p => ({ ...p, [k]: v }))
    setErrors(p => ({ ...p, [k]: undefined }))
  }

  const validate = () => {
    const e: Partial<typeof form> = {}
    if (!form.name.trim())       e.name       = 'Campo obbligatorio'
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Email non valida'
    if (!form.agencyName.trim()) e.agencyName = 'Campo obbligatorio'
    if (!form.city.trim())       e.city       = 'Campo obbligatorio'
    return e
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (honeypot) return // bot detected, silently ignore

    const e2 = validate()
    if (Object.keys(e2).length) { setErrors(e2); return }

    setStatus('sending')
    try {
      await sendAgencyContact(form)
      setStatus('ok')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{t('landing.agency.modal_title')}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{t('landing.agency.modal_subtitle')}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-500"
            aria-label="Chiudi"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {status === 'ok' ? (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-lg">{t('landing.agency.success')}</p>
              </div>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                {t('landing.agency.close')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Honeypot — hidden from humans, visible to bots */}
              <div className="absolute -top-[9999px] left-0 w-px h-px overflow-hidden" aria-hidden="true">
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={e => setHoneypot(e.target.value)}
                />
              </div>

              <Field label={t('landing.agency.name_label')} error={errors.name} required>
                <input
                  type="text" value={form.name} onChange={e => upd('name', e.target.value)}
                  className={inputCls(!!errors.name)} placeholder="Mario Rossi"
                />
              </Field>

              <Field label={t('landing.agency.email_label')} error={errors.email} required>
                <input
                  type="email" value={form.email} onChange={e => upd('email', e.target.value)}
                  className={inputCls(!!errors.email)} placeholder="m.rossi@agenzia.it"
                />
              </Field>

              <Field label={t('landing.agency.agency_label')} error={errors.agencyName} required>
                <input
                  type="text" value={form.agencyName} onChange={e => upd('agencyName', e.target.value)}
                  className={inputCls(!!errors.agencyName)} placeholder="Agenzia Immobiliare Roma"
                />
              </Field>

              <Field label={t('landing.agency.city_label')} error={errors.city} required>
                <input
                  type="text" value={form.city} onChange={e => upd('city', e.target.value)}
                  className={inputCls(!!errors.city)} placeholder="Milano, Lombardia"
                />
              </Field>

              <Field label={t('landing.agency.msg_label')} error={undefined}>
                <textarea
                  value={form.message} onChange={e => upd('message', e.target.value)}
                  rows={3} className={inputCls(false)}
                  placeholder="Descrivici le tue esigenze…"
                />
              </Field>

              {status === 'error' && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {t('landing.agency.error')}
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-all"
              >
                <Send className="w-4 h-4" />
                {status === 'sending' ? t('landing.agency.sending') : t('landing.agency.submit')}
              </button>

              <p className="text-xs text-slate-400 text-center">
                I tuoi dati sono trattati secondo la nostra{' '}
                <Link to="/legal/privacy" className="underline">Privacy Policy</Link>.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({
  label, error, required, children,
}: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

const inputCls = (hasError: boolean) =>
  `w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-colors
   focus:ring-2 focus:ring-blue-500 focus:border-transparent
   ${hasError ? 'border-red-400 bg-red-50' : 'border-slate-200 bg-white'}`
