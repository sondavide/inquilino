import { useEffect, useState } from 'react'
import { adminApi } from '@/api/admin'
import type { SupervisorUser } from '@/types'

export default function SupervisorManagementPage() {
  const [supervisors, setSupervisors] = useState<SupervisorUser[]>([])
  const [loading, setLoading]         = useState(true)
  const [creating, setCreating]       = useState(false)

  // Form
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone]       = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [success, setSuccess]   = useState(false)

  useEffect(() => {
    adminApi.listSupervisors()
      .then(setSupervisors)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setCreating(true)
    try {
      const s = await adminApi.createSupervisor(email, password, phone || undefined)
      setSupervisors(prev => [...prev, s])
      setEmail(''); setPassword(''); setPhone('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message ?? 'Errore durante la creazione'
      setError(msg)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="w-full px-4 py-6 space-y-8">
      {/* Crea supervisore */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h2 className="text-sm font-semibold">Crea nuovo supervisore</h2>
        </div>
        <form onSubmit={handleCreate} className="px-4 py-4 space-y-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-muted-foreground uppercase tracking-wide">Email *</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-ring bg-background"
              placeholder="supervisor@inquilino.it"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-muted-foreground uppercase tracking-wide">Password * (min. 8 caratteri)</label>
            <input
              type="password" required minLength={8} value={password} onChange={e => setPassword(e.target.value)}
              className="text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-ring bg-background"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-muted-foreground uppercase tracking-wide">Telefono</label>
            <input
              type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              className="text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-ring bg-background"
              placeholder="+39 …"
            />
          </div>
          {error   && <p className="text-xs text-destructive">{error}</p>}
          {success && <p className="text-xs text-emerald-600">Supervisore creato con successo!</p>}
          <button
            type="submit" disabled={creating}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {creating ? 'Creazione…' : 'Crea supervisore'}
          </button>
        </form>
      </div>

      {/* Lista supervisori */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30">
          <h2 className="text-sm font-semibold">Supervisori ({supervisors.length})</h2>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-6">Caricamento…</p>
        ) : supervisors.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Nessun supervisore</p>
        ) : (
          <div className="divide-y">
            {supervisors.map(s => (
              <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                  {s.email.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.email}</p>
                  {s.phone && <p className="text-xs text-muted-foreground">{s.phone}</p>}
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-blue-100 text-blue-700 border-blue-200">
                  SUPERVISOR
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
