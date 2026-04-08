import { useNavigate } from 'react-router-dom'
import { useLang } from '@/i18n'
import type { ListingCardDto } from '@/types'
import MatchBadge from './MatchBadge'

interface Props {
  match: ListingCardDto
}

export default function ListingCard({ match }: Props) {
  const { t } = useLang()
  const navigate = useNavigate()

  const location = [match.streetName, match.district, match.municipality]
    .filter(Boolean).join(', ')

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden active:opacity-90 cursor-pointer"
      onClick={() => navigate(`/matches/${match.matchId}`)}
    >
      {/* Cover image */}
      <div className="relative h-48 bg-gray-100">
        {match.coverImageUrl ? (
          <img
            src={match.coverImageUrl}
            alt={match.title ?? ''}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-4xl">🏠</div>
        )}
        <div className="absolute top-2 left-2">
          <MatchBadge band={match.matchBand} size="sm" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        {/* Title + price */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-gray-900 text-sm leading-snug line-clamp-2 flex-1">
            {match.title ?? `${t(`propertyType.${match.propertyType}` as any)} – ${match.municipality}`}
          </h3>
          {match.monthlyRent && (
            <span className="font-bold text-gray-900 text-sm whitespace-nowrap">
              €{match.monthlyRent.toLocaleString()}
              <span className="text-gray-400 font-normal">/mo</span>
            </span>
          )}
        </div>

        {/* Location */}
        <p className="text-xs text-gray-500 flex items-center gap-1">
          <span>📍</span>
          <span className="line-clamp-1">{location || '—'}</span>
        </p>

        {/* Features row */}
        <div className="flex flex-wrap gap-3 text-xs text-gray-600">
          {match.surfaceSqm   && <span>📐 {match.surfaceSqm} m²</span>}
          {match.roomsCount   && <span>🚪 {match.roomsCount} loc.</span>}
          {match.bathroomsCount && <span>🚿 {match.bathroomsCount}</span>}
          {match.floorNumber != null && <span>🏢 p. {match.floorNumber}</span>}
          {match.furnishedStatus === 'furnished' && <span>🛋️ Arredato</span>}
        </div>

        {/* Compatibility badges */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {match.priceCompatible  && <Badge label={t('match.badge.price')}  color="green" />}
          {match.areaCompatible   && <Badge label={t('match.badge.area')}   color="blue"  />}
          {match.timingCompatible && <Badge label={t('match.badge.timing')} color="purple"/>}
        </div>
      </div>
    </div>
  )
}

function Badge({ label, color }: { label: string; color: 'green' | 'blue' | 'purple' }) {
  const cls = {
    green:  'bg-green-50 text-green-700',
    blue:   'bg-blue-50 text-blue-700',
    purple: 'bg-purple-50 text-purple-700',
  }[color]
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {label}
    </span>
  )
}
