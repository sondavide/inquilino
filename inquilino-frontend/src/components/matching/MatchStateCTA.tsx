import { useState } from 'react'
import { useLang } from '@/i18n'
import type { MatchState } from '@/types'

// ─── Lato Inquilino ───────────────────────────────────────────────────────────

interface TenantCTAProps {
  matchId:    string
  state:      MatchState
  onInterest:     () => Promise<void>
  onDismiss:      () => Promise<void>
  onAcceptInvite: () => Promise<void>
  onUnlock:       () => Promise<void>
}

export function TenantMatchCTA({
  state, onInterest, onDismiss, onAcceptInvite, onUnlock
}: TenantCTAProps) {
  const { t } = useLang()
  const [loading, setLoading] = useState(false)

  async function run(fn: () => Promise<void>) {
    setLoading(true)
    try { await fn() } finally { setLoading(false) }
  }

  if (state === 'CONTACT_UNLOCKED') {
    return (
      <div className="inline-flex items-center gap-1.5 text-sm text-emerald-700 font-medium">
        <span>✓</span>
        <span>{t('match.state.CONTACT_UNLOCKED')}</span>
      </div>
    )
  }

  if (state === 'MUTUAL_INTEREST') {
    return (
      <button
        disabled={loading}
        onClick={() => run(onUnlock)}
        className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm active:opacity-80 disabled:opacity-50"
      >
        {loading ? '…' : t('match.cta.tenant.unlock')}
      </button>
    )
  }

  if (state === 'LANDLORD_INTERESTED') {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-amber-700 font-medium text-center">
          {t('match.state.LANDLORD_INTERESTED')}
        </p>
        <button
          disabled={loading}
          onClick={() => run(onAcceptInvite)}
          className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm active:opacity-80 disabled:opacity-50"
        >
          {loading ? '…' : t('match.cta.tenant.accept_invite')}
        </button>
        <button
          disabled={loading}
          onClick={() => run(onDismiss)}
          className="w-full py-2 rounded-xl border border-gray-300 text-gray-600 text-sm active:opacity-80 disabled:opacity-50"
        >
          {t('match.cta.tenant.dismiss')}
        </button>
      </div>
    )
  }

  if (state === 'TENANT_INTERESTED') {
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-blue-700 font-medium">
          {t('match.cta.tenant.interested_done')}
        </span>
        <button
          disabled={loading}
          onClick={() => run(onDismiss)}
          className="text-xs text-gray-400 underline"
        >
          {t('match.cta.tenant.dismiss')}
        </button>
      </div>
    )
  }

  // ALGORITHMIC
  return (
    <div className="flex gap-2">
      <button
        disabled={loading}
        onClick={() => run(onInterest)}
        className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm active:opacity-80 disabled:opacity-50"
      >
        {loading ? '…' : t('match.cta.tenant.interest')}
      </button>
      <button
        disabled={loading}
        onClick={() => run(onDismiss)}
        className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-600 text-sm active:opacity-80 disabled:opacity-50"
      >
        {t('match.cta.tenant.dismiss')}
      </button>
    </div>
  )
}

// ─── Lato Locatore ────────────────────────────────────────────────────────────

interface LandlordCTAProps {
  matchId:         string
  state:           MatchState
  onInterest:      () => Promise<void>
  onInvite:        () => Promise<void>
  onDismiss:       () => Promise<void>
  onUnlock:        () => Promise<void>
}

export function LandlordMatchCTA({
  state, onInterest, onInvite, onDismiss, onUnlock
}: LandlordCTAProps) {
  const { t } = useLang()
  const [loading, setLoading] = useState(false)

  async function run(fn: () => Promise<void>) {
    setLoading(true)
    try { await fn() } finally { setLoading(false) }
  }

  if (state === 'CONTACT_UNLOCKED') {
    return (
      <div className="inline-flex items-center gap-1.5 text-sm text-emerald-700 font-medium">
        <span>✓</span>
        <span>{t('match.state.CONTACT_UNLOCKED')}</span>
      </div>
    )
  }

  if (state === 'MUTUAL_INTEREST') {
    return (
      <button
        disabled={loading}
        onClick={() => run(onUnlock)}
        className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm active:opacity-80 disabled:opacity-50"
      >
        {loading ? '…' : t('match.cta.landlord.unlock')}
      </button>
    )
  }

  if (state === 'LANDLORD_INTERESTED') {
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-blue-700 font-medium">
          {t('match.state.LANDLORD_INTERESTED')}
        </span>
        <button
          disabled={loading}
          onClick={() => run(onDismiss)}
          className="text-xs text-gray-400 underline"
        >
          {t('match.cta.landlord.dismiss')}
        </button>
      </div>
    )
  }

  if (state === 'TENANT_INTERESTED') {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-blue-700 font-medium text-center">
          {t('match.state.TENANT_INTERESTED')}
        </p>
        <button
          disabled={loading}
          onClick={() => run(onInvite)}
          className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm active:opacity-80 disabled:opacity-50"
        >
          {loading ? '…' : t('match.cta.landlord.invite')}
        </button>
        <button
          disabled={loading}
          onClick={() => run(onDismiss)}
          className="w-full py-2 rounded-xl border border-gray-300 text-gray-600 text-sm active:opacity-80 disabled:opacity-50"
        >
          {t('match.cta.landlord.dismiss')}
        </button>
      </div>
    )
  }

  // ALGORITHMIC
  return (
    <div className="flex gap-2">
      <button
        disabled={loading}
        onClick={() => run(onInterest)}
        className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm active:opacity-80 disabled:opacity-50"
      >
        {loading ? '…' : t('match.cta.landlord.interest')}
      </button>
      <button
        disabled={loading}
        onClick={() => run(onInvite)}
        className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm active:opacity-80 disabled:opacity-50"
      >
        {loading ? '…' : t('match.cta.landlord.invite')}
      </button>
      <button
        disabled={loading}
        onClick={() => run(onDismiss)}
        className="px-3 py-2.5 rounded-xl border border-gray-300 text-gray-500 text-sm active:opacity-80 disabled:opacity-50"
      >
        ✕
      </button>
    </div>
  )
}
