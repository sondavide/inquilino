import { useEffect, useState } from 'react'
import { tenantMatchApi } from '@/api/matching'
import type { ListingCardDto } from '@/types'
import MatchBadge from '@/components/matching/MatchBadge'
import { resolveMediaUrl } from '@/lib/utils'

// ─── Lookup tables ────────────────────────────────────────────────────────────

const PROPERTY: Record<string, string> = {
  APARTMENT: 'Appartamento', STUDIO: 'Monolocale', LOFT: 'Loft',
  PENTHOUSE: 'Attico', HOUSE: 'Casa', VILLA: 'Villa',
  ROOM: 'Stanza', BED_IN_SHARED_ROOM: 'Posto letto', OTHER: 'Altro',
}

const LISTING_TYPE: Record<string, string> = {
  LONG_TERM_RENT:    'Affitto residenziale',
  SHORT_TERM_RENT:   'Affitto breve',
  TRANSITIONAL_RENT: 'Affitto transitorio',
  STUDENT_RENT:      'Affitto studentesco',
  ROOM_RENT:         'Stanza in affitto',
}

const FURNISHED: Record<string, string> = {
  FURNISHED:           'Arredato',
  PARTIALLY_FURNISHED: 'Parzialmente arredato',
  UNFURNISHED:         'Non arredato',
}

// ─── Utility components ───────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
      {children}
    </h3>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right max-w-[55%]">{value}</span>
    </div>
  )
}

function CompatChip({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium border ${
      ok
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-gray-50 text-gray-400 border-gray-200'
    }`}>
      {ok ? '✓' : '–'} {label}
    </span>
  )
}

// ─── Full listing card ────────────────────────────────────────────────────────

function MutualListingCard({
  m,
  onUnlock,
  unlocking,
}: {
  m:         ListingCardDto
  onUnlock:  (m: ListingCardDto) => void
  unlocking: boolean
}) {
  const coverUrl      = m.coverImageUrl ? resolveMediaUrl(m.coverImageUrl) : null
  const propertyLabel = PROPERTY[m.propertyType]     ?? m.propertyType
  const listingLabel  = LISTING_TYPE[m.listingType]  ?? m.listingType
  const furnishedLabel = m.furnishedStatus
    ? (FURNISHED[m.furnishedStatus] ?? m.furnishedStatus.replace(/_/g, ' '))
    : null
  const location = [m.district, m.municipality].filter(Boolean).join(', ')
  const address  = m.matchState === 'CONTACT_UNLOCKED' && m.fullAddress ? m.fullAddress : location
  const totalCost = (m.monthlyRent ?? 0) + (m.condominiumFees ?? 0)

  const structuralRows = [
    m.surfaceSqm     != null && { label: 'Superficie',      value: `${m.surfaceSqm} m²` },
    m.roomsCount     != null && { label: 'Locali',          value: m.roomsCount },
    m.bedroomsCount  != null && { label: 'Camere da letto', value: m.bedroomsCount },
    m.bathroomsCount != null && { label: 'Bagni',           value: m.bathroomsCount },
    m.floorNumber    != null && { label: 'Piano',           value: m.floorNumber },
                                 { label: 'Ascensore',      value: m.elevator ? 'Sì' : 'No' },
    furnishedLabel             && { label: 'Arredamento',   value: furnishedLabel },
                                 { label: 'Animali',        value: m.petsAllowed ? 'Ammessi' : 'Non ammessi' },
                                 { label: 'Fumo',           value: m.smokingAllowed ? 'Consentito' : 'Non consentito' },
  ].filter(Boolean) as { label: string; value: React.ReactNode }[]

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

      {/* ── Foto copertina ────────────────────────────────────────────────── */}
      <div className="relative w-full bg-gray-100" style={{ height: 180 }}>
        {coverUrl ? (
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🏠</div>
        )}
        <div className="absolute top-3 right-3">
          <MatchBadge band={m.matchBand} size="sm" />
        </div>
        {m.matchState === 'CONTACT_UNLOCKED' && (
          <div className="absolute bottom-3 left-3 bg-emerald-600 text-white text-xs font-semibold
                          px-2.5 py-1 rounded-full">
            🔓 Contatti sbloccati
          </div>
        )}
        {m.matchState === 'MUTUAL_INTEREST' && (
          <div className="absolute bottom-3 left-3 bg-blue-600 text-white text-xs font-semibold
                          px-2.5 py-1 rounded-full">
            💚 Match reciproco
          </div>
        )}
      </div>

      {/* ── Prezzo ────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-3 border-b border-gray-100">
        {m.monthlyRent ? (
          <>
            <span className="text-2xl font-bold text-gray-900">
              € {m.monthlyRent.toLocaleString('it-IT')}
            </span>
            <span className="text-sm text-gray-500 ml-1">al mese</span>
          </>
        ) : (
          <span className="text-lg text-gray-400">Prezzo non indicato</span>
        )}
        {m.condominiumFees != null && (
          <p className="text-xs text-gray-400 mt-0.5">
            + € {m.condominiumFees.toLocaleString('it-IT')} spese condominiali
          </p>
        )}
      </div>

      {/* ── Tipo + indirizzo ──────────────────────────────────────────────── */}
      <div className="px-5 py-3 border-b border-gray-100">
        <p className="font-semibold text-gray-900">{propertyLabel} · {listingLabel}</p>
        <p className="text-sm text-gray-500 mt-0.5">📍 {address}</p>
      </div>

      {/* ── Compatibilità ─────────────────────────────────────────────────── */}
      <div className="px-5 py-3 border-b border-gray-100 flex gap-2 flex-wrap">
        <CompatChip ok={m.areaCompatible}   label="Zona" />
        <CompatChip ok={m.priceCompatible}  label="Prezzo" />
        <CompatChip ok={m.timingCompatible} label="Timing" />
      </div>

      {/* ── Analisi AI ────────────────────────────────────────────────────── */}
      {(m.matchSummary || m.description) && (
        <div className="px-5 pt-4 pb-3 border-b border-gray-100 space-y-2">
          <SectionTitle>Descrizione</SectionTitle>
          {m.matchSummary && (
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-blue-700 mb-1">🤖 Analisi compatibilità</p>
              <p className="text-blue-800 text-xs leading-relaxed">{m.matchSummary}</p>
            </div>
          )}
          {m.description && (
            <p className="text-sm text-gray-700 leading-relaxed">{m.description}</p>
          )}
        </div>
      )}

      {/* ── Caratteristiche ───────────────────────────────────────────────── */}
      {structuralRows.length > 0 && (
        <div className="px-5 pt-4 pb-1 border-b border-gray-100">
          <SectionTitle>Caratteristiche</SectionTitle>
          {structuralRows.map((row, i) => (
            <DetailRow key={i} label={row.label} value={row.value} />
          ))}
        </div>
      )}

      {/* ── Costi ─────────────────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-1 border-b border-gray-100">
        <SectionTitle>Costi</SectionTitle>
        {m.monthlyRent != null && (
          <DetailRow label="Canone mensile" value={`€ ${m.monthlyRent.toLocaleString('it-IT')}`} />
        )}
        {m.condominiumFees != null && (
          <DetailRow label="Spese condominiali" value={`€ ${m.condominiumFees.toLocaleString('it-IT')}`} />
        )}
        <DetailRow
          label="Utenze"
          value={m.utilitiesIncluded ? 'Incluse nel canone' : "A carico dell'inquilino"}
        />
        {totalCost > (m.monthlyRent ?? 0) && (
          <DetailRow
            label="Totale stimato"
            value={<span className="font-bold">€ {totalCost.toLocaleString('it-IT')}</span>}
          />
        )}
      </div>

      {/* ── Disponibilità ─────────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-1 border-b border-gray-100">
        <SectionTitle>Disponibilità</SectionTitle>
        {m.availableFrom && (
          <DetailRow
            label="Disponibile dal"
            value={new Date(m.availableFrom).toLocaleDateString('it-IT', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          />
        )}
        <DetailRow label="Tipo contratto" value={listingLabel} />
      </div>

      {/* ── Contatti sbloccati ────────────────────────────────────────────── */}
      {m.matchState === 'CONTACT_UNLOCKED' && (
        <div className="px-5 pt-4 pb-3 border-b border-gray-100">
          <SectionTitle>Contatti</SectionTitle>
          <div className="bg-emerald-50 rounded-xl p-4 space-y-1.5">
            {m.landlordDisplayName  && (
              <p className="text-sm font-semibold text-gray-800">{m.landlordDisplayName}</p>
            )}
            {m.landlordContactPhone && (
              <a href={`tel:${m.landlordContactPhone}`} className="text-sm text-blue-600 block">
                📞 {m.landlordContactPhone}
              </a>
            )}
            {m.landlordContactEmail && (
              <a href={`mailto:${m.landlordContactEmail}`} className="text-sm text-blue-600 block">
                ✉️ {m.landlordContactEmail}
              </a>
            )}
            {m.fullAddress && (
              <p className="text-sm text-gray-600">📍 {m.fullAddress}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Azione ────────────────────────────────────────────────────────── */}
      <div className="px-5 py-4">
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
          <div className="w-full py-3 rounded-2xl bg-emerald-50 text-emerald-700 font-semibold
                          text-sm text-center">
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-w-7xl mx-auto">

          {loading && (
            <p className="text-center text-gray-400 text-sm py-8 col-span-full">Caricamento…</p>
          )}

          {!loading && mutuals.length === 0 && (
            <div className="col-span-full text-center py-16 space-y-2">
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
