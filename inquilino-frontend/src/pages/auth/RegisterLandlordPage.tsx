import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { registerLandlord } from '../../api/listings'

const PUBLISHER_TYPES = [
  { v: 'PRIVATE',          l: 'Privato' },
  { v: 'AGENCY',           l: 'Agenzia immobiliare' },
  { v: 'BUILDER',          l: 'Costruttore' },
  { v: 'PROPERTY_MANAGER', l: 'Property manager' },
]

export default function RegisterLandlordPage() {
  const navigate = useNavigate()
  const [form, setForm]   = useState({
    email: '', password: '', phone: '',
    displayName: '', publisherType: 'PRIVATE',
    agencyName: '', vatNumber: '', reaNumber: '',
    contactMode: 'platform_only', contactPhone: '', contactEmail: '', websiteUrl: '',
  })
  const [error, setError]   = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isAgency = form.publisherType !== 'PRIVATE'
  const upd = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

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
      })
      localStorage.setItem('auth_token', res.token)
      navigate('/landlord/listings')
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Errore durante la registrazione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg p-7">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Registrazione Locatore</h1>
          <p className="text-sm text-gray-500 mt-1">Pubblica i tuoi immobili su Inquilino</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo inserzionista */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo inserzionista</label>
            <div className="grid grid-cols-2 gap-2">
              {PUBLISHER_TYPES.map(t => (
                <button key={t.v} type="button" onClick={() => upd('publisherType', t.v)}
                  className={`p-2.5 text-sm rounded-lg border-2 transition
                    ${form.publisherType === t.v
                      ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                  {t.l}
                </button>
              ))}
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
            <input required type="password" minLength={8} value={form.password} onChange={e => upd('password', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefono</label>
            <input type="tel" value={form.phone} onChange={e => upd('phone', e.target.value)}
              placeholder="+39 "
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
            {loading ? 'Registrazione...' : 'Registrati come locatore'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-500 mt-4">
          Sei un inquilino?{' '}
          <Link to="/register" className="text-blue-600 hover:underline">Registrati qui</Link>
          {' '}·{' '}
          <Link to="/login" className="text-blue-600 hover:underline">Hai già un account</Link>
        </p>
      </div>
    </div>
  )
}
