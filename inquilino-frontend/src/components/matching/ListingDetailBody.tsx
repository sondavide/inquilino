import { useEffect } from 'react'
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { ListingCardDto } from '@/types'
import MatchBadge from '@/components/matching/MatchBadge'

// ─── Lookup tables ────────────────────────────────────────────────────────────

export const PROPERTY: Record<string, string> = {
  APARTMENT: 'Appartamento', STUDIO: 'Monolocale', LOFT: 'Loft',
  PENTHOUSE: 'Attico', HOUSE: 'Casa', VILLA: 'Villa',
  ROOM: 'Stanza', BED_IN_SHARED_ROOM: 'Posto letto', OTHER: 'Altro',
}

export const LISTING_TYPE: Record<string, string> = {
  LONG_TERM_RENT:    'Affitto residenziale',
  SHORT_TERM_RENT:   'Affitto breve',
  TRANSITIONAL_RENT: 'Affitto transitorio',
  STUDENT_RENT:      'Affitto studentesco',
  ROOM_RENT:         'Stanza in affitto',
}

const FURNISHED: Record<string, string> = {
  FURNISHED: 'Arredato', PARTIALLY_FURNISHED: 'Parzialmente arredato', UNFURNISHED: 'Non arredato',
}

const CONDITION: Record<string, string> = {
  NEW: 'Nuovo', RENOVATED: 'Ristrutturato', GOOD: 'Buono stato',
  TO_RENOVATE: 'Da ristrutturare', UNDER_CONSTRUCTION: 'In costruzione',
}

const KITCHEN: Record<string, string> = {
  KITCHENETTE: 'Angolo cottura', SEPARATE_KITCHEN: 'Cucina separata',
  OPEN_KITCHEN: 'Cucina a vista', NO_KITCHEN: 'Senza cucina',
}

const HEATING: Record<string, string> = {
  AUTONOMOUS: 'Autonomo', CENTRALIZED: 'Centralizzato',
  DISTRICT: 'Teleriscaldamento', NONE: 'Assente',
}

const COOLING: Record<string, string> = {
  AIR_CONDITIONING: 'Aria condizionata', FAN_COIL: 'Fan coil',
  HEAT_PUMP: 'Pompa di calore', NONE: 'Assente',
}

const ENERGY_SOURCE: Record<string, string> = {
  GAS: 'Gas', ELECTRICITY: 'Elettricità', HEAT_PUMP: 'Pompa di calore',
  WOOD: 'Legna', OIL: 'Gasolio', DISTRICT: 'Teleriscaldamento',
}

// ─── Utility sub-components ───────────────────────────────────────────────────

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
      <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">{value}</span>
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

function EnergyBadge({ cls }: { cls: string }) {
  const colors: Record<string, string> = {
    A4: 'bg-green-700 text-white', A3: 'bg-green-600 text-white',
    A2: 'bg-green-500 text-white', A1: 'bg-green-400 text-white',
    B:  'bg-lime-400 text-gray-900', C: 'bg-yellow-400 text-gray-900',
    D:  'bg-orange-400 text-white',  E: 'bg-orange-500 text-white',
    F:  'bg-red-500 text-white',     G: 'bg-red-700 text-white',
    NA: 'bg-gray-200 text-gray-500',
  }
  return (
    <span className={`inline-block text-xs font-bold px-2.5 py-0.5 rounded ${colors[cls] ?? 'bg-gray-200 text-gray-500'}`}>
      {cls}
    </span>
  )
}

// ─── Mappa ────────────────────────────────────────────────────────────────────

function SetMapView({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => { map.setView([lat, lng], 14) }, [lat, lng])
  return null
}

function ApproxMap({ lat, lng }: { lat: number; lng: number }) {
  return (
    <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 180 }}>
      <MapContainer
        center={[lat, lng]} zoom={14}
        style={{ height: '100%', width: '100%' }}
        dragging={false} scrollWheelZoom={false} zoomControl={false}
        doubleClickZoom={false} touchZoom={false} keyboard={false} attributionControl={false}
      >
        <SetMapView lat={lat} lng={lng} />
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Circle center={[lat, lng]} radius={250}
          pathOptions={{ color: '#3b82f6', fillColor: '#93c5fd', fillOpacity: 0.35, weight: 2 }} />
      </MapContainer>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ListingDetailBody({ card, px = 'px-4 md:px-6' }: {
  card: ListingCardDto
  px?:  string
}) {
  const propertyLabel  = PROPERTY[card.propertyType]    ?? card.propertyType
  const listingLabel   = LISTING_TYPE[card.listingType] ?? card.listingType
  const location       = [card.district, card.municipality].filter(Boolean).join(', ')
  const address        = card.matchState === 'CONTACT_UNLOCKED' && card.fullAddress
    ? card.fullAddress : location
  const totalCost      = (card.monthlyRent ?? 0) + (card.condominiumFees ?? 0)
  const furnishedLabel = card.furnishedStatus ? (FURNISHED[card.furnishedStatus] ?? card.furnishedStatus) : null
  const conditionLabel = card.conditionStatus ? (CONDITION[card.conditionStatus] ?? card.conditionStatus) : null
  const kitchenLabel   = card.kitchenStatus   ? (KITCHEN[card.kitchenStatus]     ?? card.kitchenStatus)   : null
  const heatingLabel   = card.heatingType     ? (HEATING[card.heatingType]       ?? card.heatingType)     : null
  const coolingLabel   = card.coolingType     ? (COOLING[card.coolingType]       ?? card.coolingType)     : null
  const energySrcLabel = card.heatingEnergySource ? (ENERGY_SOURCE[card.heatingEnergySource] ?? card.heatingEnergySource) : null

  return (
    <div className="bg-white">

      {/* ── PREZZO ─────────────────────────────────────────────────────────── */}
      <div className={`${px} pt-4 pb-3 border-b border-gray-100`}>
        <div className="flex items-end justify-between gap-3">
          <div>
            {card.monthlyRent ? (
              <>
                <span className="text-3xl font-bold text-gray-900">
                  € {card.monthlyRent.toLocaleString('it-IT')}
                </span>
                <span className="text-base text-gray-500 ml-1">al mese</span>
              </>
            ) : (
              <span className="text-xl text-gray-400">Prezzo non indicato</span>
            )}
          </div>
          {card.matchBand && (
            <div className="mb-0.5">
              <MatchBadge band={card.matchBand} size="sm" />
            </div>
          )}
        </div>
      </div>

      {/* ── TIPO + INDIRIZZO ──────────────────────────────────────────────── */}
      <div className={`${px} py-3 border-b border-gray-100`}>
        <p className="font-semibold text-gray-900 text-base">{propertyLabel} · {listingLabel}</p>
        <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
          <span>📍</span> {address}
        </p>
      </div>

      {/* ── COMPATIBILITÀ ────────────────────────────────────────────────── */}
      <div className={`${px} py-3 border-b border-gray-100 flex gap-2 flex-wrap`}>
        <CompatChip ok={card.areaCompatible}   label="Zona" />
        <CompatChip ok={card.priceCompatible}  label="Prezzo" />
        <CompatChip ok={card.timingCompatible} label="Timing" />
      </div>

      {/* ── DESCRIZIONE ──────────────────────────────────────────────────── */}
      {(card.matchSummary || card.description) && (
        <div className={`${px} pt-4 pb-3 border-b border-gray-100 space-y-3`}>
          <SectionTitle>Descrizione</SectionTitle>
          {card.matchSummary && (
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-blue-700 mb-1">🤖 Analisi compatibilità</p>
              <p className="text-blue-800 text-xs leading-relaxed">{card.matchSummary}</p>
            </div>
          )}
          {card.description && (
            <p className="text-sm text-gray-700 leading-relaxed">{card.description}</p>
          )}
        </div>
      )}

      {/* ── POSIZIONE ────────────────────────────────────────────────────── */}
      {card.displayLat != null && card.displayLng != null && (
        <div className={`${px} pt-4 pb-3 border-b border-gray-100`}>
          <SectionTitle>Posizione</SectionTitle>
          <p className="text-xs text-gray-400 mb-2">Posizione approssimativa</p>
          <ApproxMap lat={card.displayLat} lng={card.displayLng} />
        </div>
      )}

      {/* ── CARATTERISTICHE ──────────────────────────────────────────────── */}
      <div className={`${px} pt-4 pb-1 border-b border-gray-100`}>
        <SectionTitle>Caratteristiche</SectionTitle>
        {card.surfaceSqm         != null && <DetailRow label="Superficie"           value={`${card.surfaceSqm} m²`} />}
        {card.commercialSurfaceSqm != null && <DetailRow label="Sup. commerciale"   value={`${card.commercialSurfaceSqm} m²`} />}
        {card.roomsCount         != null && <DetailRow label="Locali"               value={card.roomsCount} />}
        {card.bedroomsCount      != null && <DetailRow label="Camere da letto"      value={card.bedroomsCount} />}
        {card.bathroomsCount     != null && <DetailRow label="Bagni"                value={card.bathroomsCount} />}
        {card.floorNumber        != null && (
          <DetailRow
            label="Piano"
            value={card.totalBuildingFloors != null
              ? `${card.floorNumber} di ${card.totalBuildingFloors}`
              : card.floorNumber}
          />
        )}
        {card.totalBuildingFloors != null && card.floorNumber == null && (
          <DetailRow label="Piani totali edificio" value={card.totalBuildingFloors} />
        )}
        <DetailRow label="Ascensore"       value={card.elevator       ? 'Sì' : 'No'} />
        {card.garageIncluded               && <DetailRow label="Garage"             value="Incluso" />}
        {card.parkingSpacesCount != null && card.parkingSpacesCount > 0 && (
          <DetailRow label="Posti auto"    value={card.parkingSpacesCount} />
        )}
        {card.balconiesCount  != null && card.balconiesCount  > 0 && <DetailRow label="Balconi"   value={card.balconiesCount} />}
        {card.terracesCount   != null && card.terracesCount   > 0 && <DetailRow label="Terrazzi"  value={card.terracesCount} />}
        {card.cellarsCount    != null && card.cellarsCount    > 0 && <DetailRow label="Cantine"   value={card.cellarsCount} />}
        {furnishedLabel                    && <DetailRow label="Arredamento"         value={furnishedLabel} />}
        {conditionLabel                    && <DetailRow label="Stato immobile"      value={conditionLabel} />}
        {kitchenLabel                      && <DetailRow label="Cucina"              value={kitchenLabel} />}
        {heatingLabel                      && <DetailRow label="Riscaldamento"       value={heatingLabel} />}
        {coolingLabel                      && <DetailRow label="Raffreddamento"      value={coolingLabel} />}
        <DetailRow label="Animali"         value={card.petsAllowed     ? 'Ammessi'      : 'Non ammessi'} />
        <DetailRow label="Fumo"            value={card.smokingAllowed  ? 'Consentito'   : 'Non consentito'} />
        <DetailRow label="Bambini"         value={card.childrenAllowed ? 'Benvenuti'    : 'Non specificato'} />
        <DetailRow label="Residenza"       value={card.residenceAllowed ? 'Consentita'  : 'Non consentita'} />
        {card.sublettingAllowed            && <DetailRow label="Subaffitto"          value="Consentito" />}
      </div>

      {/* ── COSTI ────────────────────────────────────────────────────────── */}
      <div className={`${px} pt-4 pb-1 border-b border-gray-100`}>
        <SectionTitle>Costi</SectionTitle>
        {card.monthlyRent       != null && <DetailRow label="Canone mensile"        value={`€ ${card.monthlyRent.toLocaleString('it-IT')}`} />}
        {card.condominiumFees   != null && <DetailRow label="Spese condominiali"    value={`€ ${card.condominiumFees.toLocaleString('it-IT')}`} />}
        <DetailRow
          label="Utenze"
          value={card.utilitiesIncluded ? 'Incluse nel canone' : "A carico dell'inquilino"}
        />
        {card.utilitiesEstimatedMonthly != null && (
          <DetailRow label="Stima utenze mensili" value={`€ ${card.utilitiesEstimatedMonthly.toLocaleString('it-IT')}`} />
        )}
        {card.depositMonths  != null && <DetailRow label="Deposito cauzionale"      value={`${card.depositMonths} ${card.depositMonths === 1 ? 'mensilità' : 'mensilità'}`} />}
        {card.depositAmount  != null && <DetailRow label="Importo deposito"         value={`€ ${card.depositAmount.toLocaleString('it-IT')}`} />}
        {card.agencyFeeAmount != null && <DetailRow label="Spese agenzia"           value={`€ ${card.agencyFeeAmount.toLocaleString('it-IT')}`} />}
        {card.agencyFeeNotes               && <DetailRow label="Note spese agenzia" value={card.agencyFeeNotes} />}
        {totalCost > (card.monthlyRent ?? 0) && (
          <DetailRow
            label="Costo mensile stimato"
            value={<span className="font-bold text-gray-900">€ {totalCost.toLocaleString('it-IT')}</span>}
          />
        )}
      </div>

      {/* ── DISPONIBILITÀ ────────────────────────────────────────────────── */}
      <div className={`${px} pt-4 pb-1 border-b border-gray-100`}>
        <SectionTitle>Disponibilità</SectionTitle>
        {card.availableFrom && (
          <DetailRow
            label="Disponibile dal"
            value={new Date(card.availableFrom).toLocaleDateString('it-IT', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          />
        )}
        {card.availableTo && (
          <DetailRow
            label="Disponibile fino al"
            value={new Date(card.availableTo).toLocaleDateString('it-IT', {
              day: 'numeric', month: 'long', year: 'numeric',
            })}
          />
        )}
        <DetailRow label="Tipo contratto" value={listingLabel} />
        {card.minimumContractDurationMonths != null && (
          <DetailRow label="Durata minima contratto" value={`${card.minimumContractDurationMonths} mesi`} />
        )}
        {card.maximumContractDurationMonths != null && (
          <DetailRow label="Durata massima contratto" value={`${card.maximumContractDurationMonths} mesi`} />
        )}
        {card.notesForTenants && (
          <div className="py-2">
            <p className="text-xs text-gray-400 mb-1">Note del locatore</p>
            <p className="text-sm text-gray-700 leading-relaxed">{card.notesForTenants}</p>
          </div>
        )}
      </div>

      {/* ── ENERGIA ──────────────────────────────────────────────────────── */}
      {(card.energyClass || energySrcLabel || card.renewableEnergyPresent) && (
        <div className={`${px} pt-4 pb-1 border-b border-gray-100`}>
          <SectionTitle>Energia</SectionTitle>
          {card.energyClass && (
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Classe energetica</span>
              <EnergyBadge cls={card.energyClass} />
            </div>
          )}
          {energySrcLabel && <DetailRow label="Fonte riscaldamento" value={energySrcLabel} />}
          {card.renewableEnergyPresent && <DetailRow label="Energia rinnovabile" value="Presente" />}
        </div>
      )}

      {/* ── CONTATTI (CONTACT_UNLOCKED) ───────────────────────────────────── */}
      {card.matchState === 'CONTACT_UNLOCKED' && (
        <div className={`${px} pt-4 pb-3 border-b border-gray-100`}>
          <SectionTitle>Contatti</SectionTitle>
          <div className="mt-1 bg-emerald-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
              <span>🔓</span> Contatti sbloccati
            </p>
            {card.landlordDisplayName  && <p className="text-sm text-gray-800 font-medium">{card.landlordDisplayName}</p>}
            {card.landlordContactPhone && (
              <a href={`tel:${card.landlordContactPhone}`} className="text-sm text-blue-600 block">
                📞 {card.landlordContactPhone}
              </a>
            )}
            {card.landlordContactEmail && (
              <a href={`mailto:${card.landlordContactEmail}`} className="text-sm text-blue-600 block">
                ✉️ {card.landlordContactEmail}
              </a>
            )}
            {card.fullAddress && <p className="text-sm text-gray-600">📍 {card.fullAddress}</p>}
          </div>
        </div>
      )}

      <div className="h-2" />
    </div>
  )
}
