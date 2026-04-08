import { useEffect, useState, useRef } from 'react'
import { tenantMatchApi } from '@/api/matching'
import type { ListingCardDto } from '@/types'
import MatchBadge from '@/components/matching/MatchBadge'
import ListingDetailBody from '@/components/matching/ListingDetailBody'
import { resolveMediaUrl } from '@/lib/utils'

// ─── Galleria con blur fill ───────────────────────────────────────────────────

function ListingGallery({ m }: { m: ListingCardDto }) {
  const images = m.allImageUrls?.length
    ? m.allImageUrls
    : m.coverImageUrl ? [m.coverImageUrl] : []

  const [photoIdx, setPhotoIdx] = useState(0)
  const gallStart = useRef<{ x: number; y: number } | null>(null)

  const prev = () => setPhotoIdx(i => Math.max(i - 1, 0))
  const next = () => setPhotoIdx(i => Math.min(i + 1, images.length - 1))
  const url  = images[photoIdx] ? resolveMediaUrl(images[photoIdx]) : null

  return (
    <div
      className="relative w-full bg-gray-900 overflow-hidden select-none"
      style={{ height: 220, touchAction: 'none' }}
      onPointerDown={e => { gallStart.current = { x: e.clientX, y: e.clientY } }}
      onPointerUp={e => {
        if (!gallStart.current) return
        const dx = e.clientX - gallStart.current.x
        const dy = Math.abs(e.clientY - gallStart.current.y)
        gallStart.current = null
        if (dy > 30 || Math.abs(dx) < 40) return
        dx < 0 ? next() : prev()
      }}
      onPointerCancel={() => { gallStart.current = null }}
    >
      {url ? (
        <>
          <img src={url} aria-hidden className="absolute inset-0 w-full h-full object-cover pointer-events-none"
               style={{ filter: 'blur(18px)', transform: 'scale(1.12)' }} draggable={false} />
          <div className="absolute inset-0 bg-black/20 pointer-events-none" />
          <img key={`${m.matchId}-${photoIdx}`} src={url} alt=""
               className="absolute inset-0 w-full h-full object-contain pointer-events-none" draggable={false} />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-5xl">🏠</div>
      )}

      {/* Contatore */}
      {images.length > 1 && (
        <div className="absolute top-3 left-3 bg-black/55 text-white text-xs px-2.5 py-1 rounded-full">
          {photoIdx + 1} / {images.length}
        </div>
      )}

      {/* Badge match */}
      <div className="absolute top-3 right-3">
        <MatchBadge band={m.matchBand} size="sm" />
      </div>

      {/* Stato */}
      <div className="absolute bottom-3 left-3">
        {m.matchState === 'CONTACT_UNLOCKED' && (
          <span className="bg-emerald-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            🔓 Contatti sbloccati
          </span>
        )}
        {m.matchState === 'MUTUAL_INTEREST' && (
          <span className="bg-blue-600 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
            💚 Match reciproco
          </span>
        )}
      </div>

      {/* Frecce */}
      {images.length > 1 && (
        <>
          <button onPointerDown={e => e.stopPropagation()} onClick={prev} disabled={photoIdx === 0}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full
                             bg-white/80 shadow flex items-center justify-center font-bold
                             hover:bg-white transition disabled:opacity-30">‹</button>
          <button onPointerDown={e => e.stopPropagation()} onClick={next} disabled={photoIdx === images.length - 1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full
                             bg-white/80 shadow flex items-center justify-center font-bold
                             hover:bg-white transition disabled:opacity-30">›</button>
        </>
      )}

      {/* Dots */}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
          {images.map((_, i) => (
            <span key={i} className={`rounded-full transition-all ${
              i === photoIdx ? 'w-2 h-2 bg-white' : 'w-1.5 h-1.5 bg-white/45'
            }`} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Full listing card ────────────────────────────────────────────────────────

function MutualListingCard({
  m, onUnlock, unlocking,
}: {
  m: ListingCardDto; onUnlock: (m: ListingCardDto) => void; unlocking: boolean
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <ListingGallery m={m} />
      <ListingDetailBody card={m} px="px-5" />
      <div className="px-5 py-4 border-t border-gray-100">
        {m.matchState === 'MUTUAL_INTEREST' ? (
          <button
            onClick={() => onUnlock(m)}
            disabled={unlocking}
            className="w-full py-3 rounded-2xl bg-emerald-600 text-white font-semibold text-sm
                       hover:bg-emerald-700 active:scale-[0.98] transition disabled:opacity-50"
          >
            🔓 Sblocca contatti
          </button>
        ) : (
          <div className="w-full py-3 rounded-2xl bg-emerald-50 text-emerald-700 font-semibold text-sm text-center">
            ✓ Contatti sbloccati
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TenantMutualPage() {
  const [mutuals,   setMutuals]   = useState<ListingCardDto[]>([])
  const [loading,   setLoading]   = useState(true)
  const [unlocking, setUnlocking] = useState(false)

  useEffect(() => {
    tenantMatchApi.listMutual()
      .then(setMutuals)
      .finally(() => setLoading(false))
  }, [])

  const handleUnlock = async (m: ListingCardDto) => {
    setUnlocking(true)
    try {
      const updated = await tenantMatchApi.unlockContact(m.matchId)
      setMutuals(ms => ms.map(x => x.matchId === updated.matchId ? updated : x))
    } catch { /* ignore */ }
    finally { setUnlocking(false) }
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-gray-50">
      <div className="bg-white border-b px-4 pt-4 pb-3 shrink-0">
        <h1 className="text-xl font-bold text-gray-900">💚 Match reciproci</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Annunci dove sia tu che il locatore avete espresso interesse
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4 max-w-3xl mx-auto w-full">

          {loading && (
            <p className="text-center text-gray-400 text-sm py-8">Caricamento…</p>
          )}

          {!loading && mutuals.length === 0 && (
            <div className="text-center py-16 space-y-2">
              <p className="text-4xl">💚</p>
              <p className="font-semibold text-gray-700">Nessun match reciproco ancora</p>
              <p className="text-sm text-gray-500">
                Quando un locatore ricambia il tuo interesse, appare qui
              </p>
            </div>
          )}

          {mutuals.map(m => (
            <MutualListingCard
              key={m.matchId}
              m={m}
              onUnlock={handleUnlock}
              unlocking={unlocking}
            />
          ))}

        </div>
      </div>
    </div>
  )
}
