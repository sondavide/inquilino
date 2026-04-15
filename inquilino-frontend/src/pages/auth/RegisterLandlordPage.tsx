import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerLandlord } from '../../api/listings'
import { authApi } from '../../api/auth'

const PUBLISHER_TYPES = [
  { v: 'PRIVATE',          l: 'Privato' },
  { v: 'AGENCY',           l: 'Agenzia immobiliare' },
  { v: 'BUILDER',          l: 'Costruttore' },
  { v: 'PROPERTY_MANAGER', l: 'Property manager' },
]

export default function RegisterLandlordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [form, setForm]   = useState({
    email: '', password: '', confirmPassword: '', phone: '',
    displayName: '', publisherType: 'PRIVATE',
    agencyName: '', vatNumber: '', reaNumber: '',
    contactMode: 'platform_only', contactPhone: '', contactEmail: '', websiteUrl: '',
  })
  const [showPassword, setShowPassword]   = useState(false)
  const [showConfirm, setShowConfirm]     = useState(false)
  const [otpCode, setOtpCode]             = useState('')
  const [otpResent, setOtpResent]         = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  // GDPR consent
  const [consentPrivacy, setConsentPrivacy] = useState(false)

  const isAgency = form.publisherType !== 'PRIVATE'
  const upd = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  // Step 1: validate and request OTP
  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!consentPrivacy) {
      setError('Devi accettare Privacy Policy e Termini di Servizio per continuare.')
      return
    }
    if (form.password !== form.confirmPassword) {
      setError('Le password non coincidono.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      await authApi.requestEmailVerification(form.email)
      setStep('otp')
      setOtpCode('')
    } catch (e: any) {
      const status = e?.response?.status
      if (status === 409) setError('Questa email è già registrata.')
      else setError('Errore durante l\'invio del codice. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2: verify OTP and register
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await registerLandlord({
        email:        form.email,
        password:     form.password,
        phone:        form.phone || undefined,
        displayName:  form.displayName,
        publisherType: form.publisherType,
        agencyName:   isAgency ? form.agencyName : undefined,
        vatNumber:    isAgency ? form.vatNumber : undefined,
        reaNumber:    isAgency ? form.reaNumber : undefined,
        contactMode:  form.contactMode,
        contactPhone: form.contactPhone || undefined,
        contactEmail: form.contactEmail || undefined,
        websiteUrl:   form.websiteUrl || undefined,
        verificationCode: otpCode,
      })
      localStorage.setItem('auth_token', res.token)
      navigate('/landlord/listings')
    } catch (e: any) {
      const status = e?.response?.status
      if (status === 422) setError('Codice non valido o scaduto. Riprova.')
      else if (status === 409) setError('Questa email è già registrata.')
      else setError(e?.response?.data?.message ?? 'Errore durante la registrazione')
    } finally {
      setLoading(false)
    }
  }

  const handleResendOtp = async () => {
    setError(null)
    setOtpResent(false)
    try {
      await authApi.requestEmailVerification(form.email)
      setOtpResent(true)
      setTimeout(() => setOtpResent(false), 4000)
    } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col p-4">
      {/* Back */}
      <div className="mb-4">
        <Link to="/register" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
          <span className="text-base leading-none">←</span> Indietro
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-7">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Registrazione Locatore</h1>
          <p className="text-sm text-gray-500 mt-1">Pubblica i tuoi immobili su Inquilino</p>
        </div>

        {/* Step 2: OTP verification */}
        {step === 'otp' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800">
              <p className="font-semibold mb-0.5">Controlla la tua email</p>
              <p className="text-xs leading-relaxed">
                Abbiamo inviato un codice a <strong>{form.email}</strong>. Inseriscilo qui sotto per confermare la registrazione.
              </p>
            </div>
            <input
              type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
              placeholder="Codice a 6 cifre"
              value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
              required autoComplete="one-time-code"
              className="w-full px-3 py-3 border border-gray-300 rounded-lg text-center tracking-[0.5em] text-xl font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2">{error}</div>
            )}
            {otpResent && (
              <p className="text-green-600 text-sm text-center">Codice reinviato!</p>
            )}
            <button type="submit" disabled={loading || otpCode.length < 6}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 transition">
              {loading ? 'Verifica...' : 'Verifica e crea account'}
            </button>
            <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
              <button type="button" onClick={() => { setStep('form'); setError(null); setOtpCode('') }}
                className="hover:text-gray-800 transition-colors">
                ← Cambia email
              </button>
              <button type="button" onClick={handleResendOtp}
                className="hover:text-gray-800 transition-colors underline">
                Rinvia codice
              </button>
            </div>
          </form>
        )}

        {/* Step 1: registration form */}
        {step === 'form' && (
        <form onSubmit={handleStep1} className="space-y-4">
          {/* Tipo inserzionista */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo inserzionista</label>
            <div className="grid grid-cols-2 gap-2">
              {PUBLISHER_TYPES.map(pt => {
                const isPrivate = pt.v === 'PRIVATE'
                return (
                  <div key={pt.v} className="relative">
                    <button
                      type="button"
                      disabled={!isPrivate}
                      onClick={() => isPrivate && upd('publisherType', pt.v)}
                      className={`w-full p-2.5 text-sm rounded-lg border-2 transition
                        ${isPrivate && form.publisherType === pt.v
                          ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                          : isPrivate
                            ? 'border-gray-200 text-gray-700 hover:border-gray-300'
                            : 'border-gray-100 text-gray-300 cursor-not-allowed bg-gray-50'
                        }`}
                    >
                      {pt.l}
                    </button>
                    {!isPrivate && (
                      <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 leading-none">
                        WIP
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Dati base */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isAgency ? 'Nome agenzia / display name' : 'Il tuo nome'} <span className="text-red-500">*</span>
            </label>
            <input required type="text" value={form.displayName} onChange={e => upd('displayName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {isAgency && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ragione sociale</label>
                <input type="text" value={form.agencyName} onChange={e => upd('agencyName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Partita IVA</label>
                  <input type="text" value={form.vatNumber} onChange={e => upd('vatNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">REA</label>
                  <input type="text" value={form.reaNumber} onChange={e => upd('reaNumber', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </>
          )}

          {/* Credenziali */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
            <input required type="email" value={form.email} onChange={e => upd('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password <span className="text-red-500">*</span></label>
            <LandlordPasswordInput
              value={form.password} onChange={v => upd('password', v)}
              show={showPassword} onToggle={() => setShowPassword(v => !v)}
              placeholder="Password (min. 8 caratteri)" minLength={8}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conferma password <span className="text-red-500">*</span></label>
            <LandlordPasswordInput
              value={form.confirmPassword} onChange={v => upd('confirmPassword', v)}
              show={showConfirm} onToggle={() => setShowConfirm(v => !v)}
              placeholder="Ripeti la password"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
            <input type="tel" value={form.phone} onChange={e => upd('phone', e.target.value)}
              placeholder="+39 "
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* GDPR consent */}
          <div className="space-y-2 pt-1 border-t border-gray-100">
            <p className="text-xs text-gray-500 font-medium mb-2">Consensi obbligatori</p>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox" checked={consentPrivacy}
                onChange={e => setConsentPrivacy(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-blue-600 shrink-0"
                required
              />
              <span className="text-xs text-gray-500 leading-relaxed">
                Ho letto e accetto la{' '}
                <Link to="/legal/privacy" className="text-blue-600 underline">Privacy Policy</Link>
                , la{' '}
                <Link to="/legal/cookie" className="text-blue-600 underline">Cookie Policy</Link>
                {' '}e i{' '}
                <Link to="/legal/terms" className="text-blue-600 underline">Termini di Servizio</Link>
                {' '}(obbligatorio) *
              </span>
            </label>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm
                       hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? 'Attendere…' : 'Continua →'}
          </button>
        </form>
        )}

        <p className="text-center text-xs text-gray-500 mt-4">
          Sei un inquilino?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">Registrati qui</Link>
          {' '}·{' '}
          <Link to="/login" className="text-blue-600 hover:underline">Hai già un account</Link>
        </p>
      </div>
      </div>
    </div>
  )
}

function LandlordPasswordInput({
  value, onChange, show, onToggle, placeholder, minLength,
}: {
  value: string; onChange: (v: string) => void
  show: boolean; onToggle: () => void
  placeholder: string; minLength?: number
}) {
  const fieldCls = 'w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  return (
    <div className="relative">
      <input
        required type={show ? 'text' : 'password'}
        minLength={minLength} value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="new-password"
        className={fieldCls}
      />
      <button type="button" onClick={onToggle} tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors">
        {show ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
        )}
      </button>
    </div>
  )
}
