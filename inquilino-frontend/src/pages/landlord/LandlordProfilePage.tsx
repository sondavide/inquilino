import { useEffect, useState } from 'react'
import { getLandlordProfile, updateLandlordProfile } from '../../api/listings'
import type { LandlordProfile } from '../../types'

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-border rounded-lg text-sm
                   focus:outline-none focus:ring-2 focus:ring-primary/40 bg-background"
      />
    </div>
  )
}

export default function LandlordProfilePage() {
  const [profile, setProfile] = useState<LandlordProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const [phone, setPhone]               = useState('')
  const [displayName, setDisplayName]   = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')

  useEffect(() => {
    getLandlordProfile()
      .then(p => {
        setProfile(p)
        setPhone(p.phone ?? '')
        setDisplayName(p.displayName ?? '')
        setContactPhone(p.contactPhone ?? '')
        setContactEmail(p.contactEmail ?? '')
      })
      .catch(() => setError('Errore nel caricamento del profilo'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const updated = await updateLandlordProfile({
        phone:        phone || undefined,
        displayName:  displayName || undefined,
        contactPhone: contactPhone || undefined,
        contactEmail: contactEmail || undefined,
      })
      setProfile(updated)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      setError('Errore durante il salvataggio')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh] text-sm text-muted-foreground">
      Caricamento…
    </div>
  )

  if (!profile) return (
    <div className="text-center py-12 text-destructive text-sm">{error ?? 'Profilo non trovato'}</div>
  )

  const isAgency = ['AGENCY', 'BUILDER', 'PROPERTY_MANAGER'].includes(profile.agencyName ? 'AGENCY' : '')

  return (
    <div className="px-4 py-6 w-full">
      <h1 className="text-xl font-bold mb-6">Il mio profilo</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

        {/* Colonna sinistra: dati account */}
        <div className="space-y-4 bg-card border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Dati account
          </p>

          <Field
            label="Nome visualizzato"
            value={displayName}
            onChange={setDisplayName}
            placeholder={isAgency ? 'Nome agenzia o referente' : 'Il tuo nome'}
          />

          <Field
            label="Numero di telefono"
            value={phone}
            onChange={setPhone}
            type="tel"
            placeholder="+39 "
          />
        </div>

        {/* Colonna destra: contatti pubblici + salva */}
        <div className="space-y-4 bg-card border border-border rounded-2xl p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Contatti pubblici
          </p>
          <p className="text-xs text-muted-foreground -mt-2">
            Visibili agli inquilini dopo che hai sbloccato il contatto
          </p>

          <Field
            label="Telefono di contatto"
            value={contactPhone}
            onChange={setContactPhone}
            type="tel"
            placeholder="+39 "
          />
          <Field
            label="Email di contatto"
            value={contactEmail}
            onChange={setContactEmail}
            type="email"
            placeholder="es. info@agenzia.it"
          />

          {error && <p className="text-sm text-destructive">{error}</p>}
          {saved && <p className="text-sm text-green-600">✓ Modifiche salvate</p>}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-semibold
                       rounded-xl hover:opacity-90 disabled:opacity-50 transition"
          >
            {saving ? 'Salvataggio…' : 'Salva modifiche'}
          </button>
        </div>

      </div>
    </div>
  )
}
