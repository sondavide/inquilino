import { useEffect, useState } from 'react'
import { getAgencyOperators, inviteOperator, removeOperator, updateOperatorScope } from '@/api/agency'
import type { AgencyMembershipDto } from '@/types'
import { useLang } from '@/i18n'

export default function AgencyOperatorsPage() {
  const { t } = useLang()
  const [operators, setOperators] = useState<AgencyMembershipDto[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')

  const [showInvite, setShowInvite]         = useState(false)
  const [inviteEmail, setInviteEmail]       = useState('')
  const [inviteName, setInviteName]         = useState('')
  const [inviteAllAccess, setInviteAllAccess] = useState(true)
  const [inviting, setInviting]             = useState(false)

  const [scopeModal, setScopeModal] = useState<AgencyMembershipDto | null>(null)

  useEffect(() => { fetchOperators() }, [])

  const fetchOperators = async () => {
    setLoading(true)
    try { setOperators(await getAgencyOperators()) }
    catch { setError(t('agency.operators.error_load')) }
    finally { setLoading(false) }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess(''); setInviting(true)
    try {
      const m = await inviteOperator({
        email: inviteEmail.trim().toLowerCase(),
        displayName: inviteName.trim(),
        listingScope: inviteAllAccess ? null : [],
      })
      setOperators(prev => [...prev, m])
      setShowInvite(false)
      setInviteEmail(''); setInviteName(''); setInviteAllAccess(true)
      setSuccess(t('agency.operators.success_invite'))
      setTimeout(() => setSuccess(''), 4000)
    } catch (e: any) {
      const s = e?.response?.status
      if (s === 409) setError(t('agency.operators.error_invite_dup'))
      else setError(t('agency.operators.error_invite'))
    } finally { setInviting(false) }
  }

  const handleRemove = async (op: AgencyMembershipDto) => {
    if (!window.confirm(t('agency.operators.confirm_remove', { email: op.operatorEmail }))) return
    try {
      await removeOperator(op.operatorUserId)
      setOperators(prev => prev.filter(o => o.id !== op.id))
    } catch { setError(t('agency.operators.error_remove')) }
  }

  const handleSaveScope = async (scope: string[] | null) => {
    if (!scopeModal) return
    try {
      const updated = await updateOperatorScope(scopeModal.operatorUserId, scope)
      setOperators(prev => prev.map(o => o.id === updated.id ? updated : o))
      setScopeModal(null)
    } catch { setError(t('agency.operators.error_scope')) }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">{t('agency.operators.loading')}</div>
  )

  return (
    <div className="px-4 py-6 w-full space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('agency.operators.title')}</h1>
        <button
          onClick={() => setShowInvite(v => !v)}
          className="px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition"
        >
          {t('agency.operators.invite_btn')}
        </button>
      </div>

      {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">{success}</div>}
      {error   && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{error}</div>}

      {showInvite && (
        <section className="bg-card border rounded-2xl p-5">
          <h2 className="font-semibold mb-4">{t('agency.operators.invite_title')}</h2>
          <form onSubmit={handleInvite} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">{t('agency.operators.email_label')} <span className="text-red-500">*</span></label>
              <input required type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                placeholder="operatore@esempio.it" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('agency.operators.name_label')} <span className="text-red-500">*</span></label>
              <input required type="text" value={inviteName} onChange={e => setInviteName(e.target.value)}
                placeholder="Mario Rossi" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">{t('agency.operators.access_label')}</label>
              <div className="flex gap-3">
                {[
                  { v: true,  l: t('agency.operators.all_access') },
                  { v: false, l: t('agency.operators.select_access') },
                ].map(opt => (
                  <button key={String(opt.v)} type="button"
                    onClick={() => setInviteAllAccess(opt.v)}
                    className={`flex-1 py-2 rounded-lg text-sm border-2 transition ${
                      inviteAllAccess === opt.v
                        ? 'border-violet-600 bg-violet-50 text-violet-700 font-medium'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}>{opt.l}</button>
                ))}
              </div>
              {!inviteAllAccess && (
                <p className="text-xs text-muted-foreground mt-2">{t('agency.operators.select_access_hint')}</p>
              )}
            </div>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowInvite(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm hover:bg-muted/40 transition">
                {t('agency.operators.cancel')}
              </button>
              <button type="submit" disabled={inviting}
                className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 disabled:opacity-50 transition">
                {inviting ? t('agency.operators.inviting') : t('agency.operators.invite_submit')}
              </button>
            </div>
          </form>
        </section>
      )}

      {operators.length === 0 && !showInvite && (
        <div className="text-center py-10 text-muted-foreground text-sm">
          <p className="text-3xl mb-2">👥</p>
          <p>{t('agency.operators.empty')}</p>
          <p className="text-xs mt-1">{t('agency.operators.empty_hint')}</p>
        </div>
      )}

      <ul className="space-y-3">
        {operators.map(op => (
          <li key={op.id} className="bg-card border rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-violet-100 text-violet-600 font-bold text-sm flex items-center justify-center shrink-0">
              {op.operatorEmail.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{op.operatorEmail}</p>
              <p className="text-xs text-muted-foreground">
                {op.listingScope === null
                  ? t('agency.operators.full_access')
                  : op.listingScope.length === 0
                    ? t('agency.operators.no_listings')
                    : t('agency.operators.n_listings', { n: op.listingScope.length })}
              </p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setScopeModal(op)}
                className="px-2.5 py-1.5 text-xs border rounded-lg hover:bg-muted/40 transition">
                {t('agency.operators.edit_scope')}
              </button>
              <button onClick={() => handleRemove(op)}
                className="px-2.5 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition">
                {t('agency.operators.remove')}
              </button>
            </div>
          </li>
        ))}
      </ul>

      {scopeModal && (
        <ScopeModal
          operator={scopeModal}
          onSave={handleSaveScope}
          onClose={() => setScopeModal(null)}
        />
      )}
    </div>
  )
}

function ScopeModal({ operator, onSave, onClose }: {
  operator: AgencyMembershipDto
  onSave: (scope: string[] | null) => void
  onClose: () => void
}) {
  const { t } = useLang()
  const [allAccess, setAllAccess] = useState(operator.listingScope === null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h3 className="font-semibold">{t('agency.operators.scope_modal_title', { email: operator.operatorEmail })}</h3>
        <div className="space-y-2">
          {[
            { v: true,  l: t('agency.operators.scope_all') },
            { v: false, l: t('agency.operators.scope_specific') },
          ].map(opt => (
            <label key={String(opt.v)} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={allAccess === opt.v} onChange={() => setAllAccess(opt.v)}
                className="accent-violet-600" />
              <span className="text-sm">{opt.l}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 py-2.5 border rounded-xl text-sm hover:bg-muted/40 transition">
            {t('agency.operators.cancel')}
          </button>
          <button onClick={() => onSave(allAccess ? null : (operator.listingScope ?? []))}
            className="flex-1 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-medium hover:bg-violet-700 transition">
            {t('agency.operators.scope_save')}
          </button>
        </div>
      </div>
    </div>
  )
}

const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 bg-background'
