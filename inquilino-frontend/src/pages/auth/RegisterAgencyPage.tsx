import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi } from '@/api/auth'
import { registerAgency } from '@/api/agency'
import { setToken } from '@/hooks/useAuth'
import { useLang } from '@/i18n'

export default function RegisterAgencyPage() {
  const navigate = useNavigate()
  const { t } = useLang()
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '', phone: '',
    agencyName: '', vatNumber: '', reaNumber: '', websiteUrl: '', contactPhone: '',
  })
  const [showPwd, setShowPwd]   = useState(false)
  const [showConf, setShowConf] = useState(false)
  const [otpCode, setOtpCode]   = useState('')
  const [otpResent, setOtpResent] = useState(false)
  const [consent, setConsent]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  const upd = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consent) { setError(t('agency.register.error.consent')); return }
    if (form.password !== form.confirmPassword) { setError(t('agency.register.error.pwd_mismatch')); return }
    if (!form.agencyName.trim()) { setError(t('agency.register.error.agency_name')); return }
    setError(null); setLoading(true)
    try {
      await authApi.requestEmailVerification(form.email)
      setStep('otp'); setOtpCode('')
    } catch (e: any) {
      const s = e?.response?.status
      if (s === 409) setError(t('agency.register.error.duplicate'))
      else setError(t('agency.register.error.send_otp'))
    } finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null); setLoading(true)
    try {
      const res = await registerAgency({
        email: form.email, password: form.password,
        phone: form.phone || undefined,
        agencyName: form.agencyName,
        vatNumber: form.vatNumber || undefined,
        reaNumber: form.reaNumber || undefined,
        websiteUrl: form.websiteUrl || undefined,
        contactPhone: form.contactPhone || undefined,
        verificationCode: otpCode,
      })
      setToken(res.token)
      navigate('/agency/profile')
    } catch (e: any) {
      const s = e?.response?.status
      if (s === 422) setError(t('agency.register.error.otp_invalid'))
      else if (s === 409) setError(t('agency.register.error.duplicate'))
      else setError(e?.response?.data?.message ?? t('agency.register.error.generic'))
    } finally { setLoading(false) }
  }

  const handleResendOtp = async () => {
    setError(null); setOtpResent(false)
    try { await authApi.requestEmailVerification(form.email); setOtpResent(true); setTimeout(() => setOtpResent(false), 4000) }
    catch { }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-purple-100 flex flex-col p-4">
      <div className="mb-4">
        <Link to="/register" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          <span className="text-base">←</span> {t('agency.register.back')}
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-7">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🏢</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">{t('agency.register.title')}</h1>
            <p className="text-sm text-gray-500 mt-1">{t('agency.register.subtitle')}</p>
          </div>

          <div className="mb-5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
            <p className="text-xs leading-relaxed">{t('agency.register.pending_banner')}</p>
          </div>

          {step === 'otp' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
                <p className="font-semibold mb-0.5">{t('agency.register.otp_title')}</p>
                <p className="text-xs leading-relaxed">
                  {t('agency.register.otp_desc', { email: form.email })}
                </p>
              </div>
              <input
                type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
                placeholder={t('agency.register.otp_placeholder')}
                value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                required autoComplete="one-time-code"
                className="w-full px-3 py-3 border border-gray-300 rounded-lg text-center tracking-[0.5em] text-xl font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2">{error}</div>}
              {otpResent && <p className="text-green-600 text-sm text-center">{t('agency.register.otp_resent')}</p>}
              <button type="submit" disabled={loading || otpCode.length < 6}
                className="w-full py-3 bg-violet-600 text-white rounded-xl font-semibold text-sm hover:bg-violet-700 disabled:opacity-50 transition">
                {loading ? t('agency.register.submitting') : t('agency.register.otp_verify')}
              </button>
              <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                <button type="button" onClick={() => { setStep('form'); setError(null); setOtpCode('') }}
                  className="hover:text-gray-800 transition-colors">{t('agency.register.change_email')}</button>
                <button type="button" onClick={handleResendOtp}
                  className="hover:text-gray-800 transition-colors underline">{t('agency.register.otp_resend')}</button>
              </div>
            </form>
          )}

          {step === 'form' && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('agency.register.corporate_name')} <span className="text-red-500">*</span></label>
                <input required type="text" value={form.agencyName} onChange={e => upd('agencyName', e.target.value)}
                  placeholder="Es. Immobiliare Rossi Srl" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('agency.register.vat')}</label>
                  <input type="text" value={form.vatNumber} onChange={e => upd('vatNumber', e.target.value)}
                    placeholder="IT12345678901" className={inputCls} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('agency.register.rea')}</label>
                  <input type="text" value={form.reaNumber} onChange={e => upd('reaNumber', e.target.value)}
                    placeholder="RM-123456" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('agency.register.website')}</label>
                <input type="url" value={form.websiteUrl} onChange={e => upd('websiteUrl', e.target.value)}
                  placeholder="https://www.tuaagenzia.it" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('agency.register.login_email')} <span className="text-red-500">*</span></label>
                <input required type="email" value={form.email} onChange={e => upd('email', e.target.value)}
                  className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('agency.register.contact_phone')}</label>
                <input type="tel" value={form.contactPhone} onChange={e => upd('contactPhone', e.target.value)}
                  placeholder="+39 06 12345678" className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('agency.register.password')} <span className="text-red-500">*</span></label>
                <PasswordField value={form.password} onChange={v => upd('password', v)} show={showPwd}
                  onToggle={() => setShowPwd(x => !x)} placeholder={t('agency.register.password')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('agency.register.confirm_password')} <span className="text-red-500">*</span></label>
                <PasswordField value={form.confirmPassword} onChange={v => upd('confirmPassword', v)} show={showConf}
                  onToggle={() => setShowConf(x => !x)} placeholder={t('agency.register.confirm_password')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('agency.register.phone')}</label>
                <input type="tel" value={form.phone} onChange={e => upd('phone', e.target.value)}
                  placeholder="+39 " className={inputCls} />
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer pt-1">
                <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-violet-600 shrink-0" required />
                <span className="text-xs text-gray-500 leading-relaxed">
                  Ho letto e accetto la{' '}
                  <Link to="/legal/privacy" className="text-violet-600 underline">Privacy Policy</Link>
                  , la <Link to="/legal/cookie" className="text-violet-600 underline">Cookie Policy</Link>
                  {' '}e i{' '}
                  <Link to="/legal/terms" className="text-violet-600 underline">Termini di Servizio</Link> *
                </span>
              </label>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2">{error}</div>}
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-violet-600 text-white rounded-xl font-semibold text-sm hover:bg-violet-700 disabled:opacity-50 transition">
                {loading ? t('agency.register.submitting') : t('agency.register.submit_step1')}
              </button>
            </form>
          )}

          <p className="text-center text-xs text-gray-500 mt-4">
            {t('agency.register.already_login')}{' '}
            <Link to="/login" className="text-violet-600 hover:underline">Accedi</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500'

function PasswordField({ value, onChange, show, onToggle, placeholder }: {
  value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; placeholder: string
}) {
  return (
    <div className="relative">
      <input required type={show ? 'text' : 'password'} minLength={8} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} autoComplete="new-password" className={inputCls + ' pr-10'} />
      <button type="button" onClick={onToggle} tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors">
        {show ? '🙈' : '👁'}
      </button>
    </div>
  )
}
